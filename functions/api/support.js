import { connect } from "cloudflare:sockets";

const SUPPORT_EMAIL = "support@gamingevolutioncentre.co.uk";
const SMTP_HOST = "smtp.ionos.co.uk";
const SMTP_PORT = 465;

const jsonResponse = (data, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "Cache-Control": "no-store",
        },
    });

function cleanText(value) {
    return String(value ?? "").trim();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function utf8ToBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";

    for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(
            ...bytes.subarray(index, index + 0x8000)
        );
    }

    return btoa(binary);
}

function wrapBase64(value) {
    return utf8ToBase64(value).match(/.{1,76}/g)?.join("\r\n") || "";
}

function createSmtpReader(reader) {
    const decoder = new TextDecoder();
    let buffer = "";

    return async function readResponse() {
        const lines = [];
        let responseCode = null;

        while (true) {
            let lineEnd = buffer.indexOf("\r\n");

            while (lineEnd === -1) {
                const { value, done } = await reader.read();

                if (done) {
                    throw new Error("SMTP connection closed unexpectedly.");
                }

                buffer += decoder.decode(value, { stream: true });
                lineEnd = buffer.indexOf("\r\n");
            }

            const line = buffer.slice(0, lineEnd);
            buffer = buffer.slice(lineEnd + 2);

            if (!/^\d{3}[ -]/.test(line)) {
                continue;
            }

            const code = Number(line.slice(0, 3));
            responseCode ??= code;
            lines.push(line);

            if (line.charAt(3) === " ") {
                return {
                    code: responseCode,
                    text: lines.join("\n"),
                };
            }
        }
    };
}

async function expectResponse(readResponse, expectedCodes) {
    const response = await readResponse();

    if (!expectedCodes.includes(response.code)) {
        throw new Error(`SMTP error ${response.code}: ${response.text}`);
    }

    return response;
}

async function sendCommand(writer, readResponse, command, expectedCodes) {
    await writer.write(
        new TextEncoder().encode(`${command}\r\n`)
    );

    return expectResponse(readResponse, expectedCodes);
}

function buildEmail({ to, subject, body, replyTo }) {
    const headers = [
        `From: Gaming Evolution Centre <${SUPPORT_EMAIL}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: <${crypto.randomUUID()}@gamingevolutioncentre.co.uk>`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
    ];

    if (replyTo) {
        headers.push(`Reply-To: ${replyTo}`);
    }

    return `${headers.join("\r\n")}\r\n\r\n${wrapBase64(body)}`;
}

async function sendEmailTransaction(writer, readResponse, email) {
    await sendCommand(
        writer,
        readResponse,
        `MAIL FROM:<${SUPPORT_EMAIL}>`,
        [250]
    );

    await sendCommand(
        writer,
        readResponse,
        `RCPT TO:<${email.to}>`,
        [250, 251]
    );

    await sendCommand(writer, readResponse, "DATA", [354]);

    const rawMessage = buildEmail(email)
        .replace(/(^|\r\n)\./g, "$1..");

    await writer.write(
        new TextEncoder().encode(`${rawMessage}\r\n.\r\n`)
    );

    await expectResponse(readResponse, [250]);
}

async function sendSupportEmails(password, visitor) {
    const socket = connect(
        {
            hostname: SMTP_HOST,
            port: SMTP_PORT,
        },
        {
            secureTransport: "on",
        }
    );

    await socket.opened;

    const reader = socket.readable.getReader();
    const writer = socket.writable.getWriter();
    const readResponse = createSmtpReader(reader);

    try {
        await expectResponse(readResponse, [220]);
        await sendCommand(
            writer,
            readResponse,
            "EHLO gamingevolutioncentre.co.uk",
            [250]
        );
        await sendCommand(writer, readResponse, "AUTH LOGIN", [334]);
        await sendCommand(
            writer,
            readResponse,
            utf8ToBase64(SUPPORT_EMAIL),
            [334]
        );
        await sendCommand(
            writer,
            readResponse,
            utf8ToBase64(password),
            [235]
        );

        await sendEmailTransaction(writer, readResponse, {
            to: SUPPORT_EMAIL,
            subject: `Website support request from ${visitor.name.replace(/[\r\n]+/g, " ")}`,
            replyTo: visitor.email,
            body: [
                "A new support request was submitted on the Gaming Evolution Centre website.",
                "",
                `Name: ${visitor.name}`,
                `Contact email: ${visitor.email}`,
                "",
                "Complaint / help needed:",
                visitor.message,
            ].join("\n"),
        });

        await sendEmailTransaction(writer, readResponse, {
            to: visitor.email,
            subject: "Your Gaming Evolution Centre support request",
            body: [
                `Hello ${visitor.name},`,
                "",
                "Thank you for submitting your problem/help. I will get back to you within 24-48 hours.",
                "",
                "If 48 hours have passed without any response, please wait until 5 business days have passed. If you still have not received a response, feel free to send another email to support@gamingevolutioncentre.co.uk. Please include your name and a short message referring to the message you submitted on the website, so it is easier for me to find your original submission.",
                "",
                "Thank you for submitting your problem/help.",
                "",
                "Take care",
                "Gaming Evolution Centre",
            ].join("\n"),
        });

        try {
            await sendCommand(writer, readResponse, "QUIT", [221]);
        } catch (_) {
            // The emails have already been accepted by the SMTP server.
        }
    } finally {
        try {
            reader.releaseLock();
        } catch (_) {}

        try {
            writer.releaseLock();
        } catch (_) {}

        try {
            await socket.close();
        } catch (_) {}
    }
}

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const contentType = request.headers.get("content-type") || "";
        let submittedData = {};

        if (contentType.includes("application/json")) {
            submittedData = await request.json();
        } else if (
            contentType.includes("application/x-www-form-urlencoded") ||
            contentType.includes("multipart/form-data")
        ) {
            const formData = await request.formData();
            submittedData = Object.fromEntries(formData.entries());
        } else {
            return jsonResponse(
                { success: false, message: "Unsupported request format." },
                415
            );
        }

        const name = cleanText(submittedData.name);
        const email = cleanText(submittedData.email);
        const message = cleanText(submittedData.message);
        const website = cleanText(submittedData.website);

        if (website) {
            return jsonResponse({
                success: true,
                message: "Your support request has been received.",
            });
        }

        if (!name || !email || !message) {
            return jsonResponse(
                {
                    success: false,
                    message: "Please complete all required fields.",
                },
                400
            );
        }

        if (name.length > 100) {
            return jsonResponse(
                {
                    success: false,
                    message: "Your name cannot be longer than 100 characters.",
                },
                400
            );
        }

        if (email.length > 254 || !isValidEmail(email)) {
            return jsonResponse(
                {
                    success: false,
                    message: "Please enter a valid email address.",
                },
                400
            );
        }

        if (message.length > 5000) {
            return jsonResponse(
                {
                    success: false,
                    message: "Your message cannot be longer than 5,000 characters.",
                },
                400
            );
        }

        const smtpPassword = cleanText(env.IONOS_SMTP_PASSWORD);

        if (!smtpPassword) {
            console.error("IONOS_SMTP_PASSWORD is not configured.");

            return jsonResponse(
                {
                    success: false,
                    message: "Support email is temporarily unavailable. Please try again later.",
                },
                503
            );
        }

        await sendSupportEmails(smtpPassword, {
            name,
            email,
            message,
        });

        return jsonResponse({
            success: true,
            message: "Thank you. Your support request has been sent and a confirmation email is on its way.",
        });
    } catch (error) {
        console.error("Support form error:", error);

        return jsonResponse(
            {
                success: false,
                message: "Something went wrong while sending your support request. Please try again.",
            },
            500
        );
    }
}

export function onRequestGet() {
    return jsonResponse(
        { success: false, message: "Method not allowed." },
        405
    );
}

export const onRequestPut = onRequestGet;
export const onRequestPatch = onRequestGet;
export const onRequestDelete = onRequestGet;
