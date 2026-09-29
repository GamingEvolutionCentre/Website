const jsonResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "Cache-Control": "no-store",
        },
    });
};

function cleanText(value) {
    return String(value ?? "").trim();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function onRequestPost(context) {
    try {
        const { request } = context;

        const contentType =
            request.headers.get("content-type") || "";

        let submittedData = {};

        if (contentType.includes("application/json")) {
            submittedData = await request.json();
        } else if (
            contentType.includes(
                "application/x-www-form-urlencoded"
            ) ||
            contentType.includes("multipart/form-data")
        ) {
            const formData = await request.formData();

            submittedData = Object.fromEntries(
                formData.entries()
            );
        } else {
            return jsonResponse(
                {
                    success: false,
                    message:
                        "Unsupported request format.",
                },
                415
            );
        }

        const name = cleanText(submittedData.name);
        const email = cleanText(submittedData.email);
        const subject = cleanText(submittedData.subject);
        const message = cleanText(submittedData.message);

        /*
         * Honeypot field.
         *
         * Normal visitors should never fill this in.
         * Bots often will.
         */
        const website = cleanText(submittedData.website);

        if (website) {
            /*
             * Pretend the request was accepted so the bot
             * does not learn that it was detected.
             */
            return jsonResponse({
                success: true,
                message:
                    "Your support request has been received.",
            });
        }

        if (!name || !email || !subject || !message) {
            return jsonResponse(
                {
                    success: false,
                    message:
                        "Please complete all required fields.",
                },
                400
            );
        }

        if (name.length > 100) {
            return jsonResponse(
                {
                    success: false,
                    message:
                        "Your name cannot be longer than 100 characters.",
                },
                400
            );
        }

        if (email.length > 254) {
            return jsonResponse(
                {
                    success: false,
                    message:
                        "Your email address is too long.",
                },
                400
            );
        }

        if (!isValidEmail(email)) {
            return jsonResponse(
                {
                    success: false,
                    message:
                        "Please enter a valid email address.",
                },
                400
            );
        }

        if (subject.length > 150) {
            return jsonResponse(
                {
                    success: false,
                    message:
                        "Your subject cannot be longer than 150 characters.",
                },
                400
            );
        }

        if (message.length > 5000) {
            return jsonResponse(
                {
                    success: false,
                    message:
                        "Your message cannot be longer than 5,000 characters.",
                },
                400
            );
        }

        /*
         * =====================================================
         * Support request is now validated.
         * =====================================================
         *
         * We will add the actual delivery system here next.
         *
         * For example:
         *
         * - send an email
         * - send to Discord
         * - store it in a database
         * - create a support ticket
         *
         * Secrets/API keys should be stored in Cloudflare
         * environment variables and accessed with:
         *
         * context.env.SECRET_NAME
         *
         * Never put private API keys directly in this file.
         */

        console.log("Support request received:", {
            name,
            email,
            subject,
            messageLength: message.length,
        });

        return jsonResponse({
            success: true,
            message:
                "Thanks! Your support request has been received.",
        });
    } catch (error) {
        console.error(
            "Support form error:",
            error
        );

        return jsonResponse(
            {
                success: false,
                message:
                    "Something went wrong while sending your support request. Please try again.",
            },
            500
        );
    }
}

export function onRequestGet() {
    return jsonResponse(
        {
            success: false,
            message: "Method not allowed.",
        },
        405
    );
}

export function onRequestPut() {
    return jsonResponse(
        {
            success: false,
            message: "Method not allowed.",
        },
        405
    );
}

export function onRequestPatch() {
    return jsonResponse(
        {
            success: false,
            message: "Method not allowed.",
        },
        405
    );
}

export function onRequestDelete() {
    return jsonResponse(
        {
            success: false,
            message: "Method not allowed.",
        },
        405
    );
}
