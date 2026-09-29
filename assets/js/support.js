document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#support-form");
    const status = document.querySelector("#support-form-status");
    const submitButton = form?.querySelector(
        'button[type="submit"]'
    );

    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.dataset.originalText =
                submitButton.textContent;

            submitButton.textContent = "Sending...";
        }

        if (status) {
            status.textContent = "Sending your request...";
            status.className = "support-form-status";
        }

        const formData = new FormData(form);

        const payload = {
            name: formData.get("name"),
            email: formData.get("email"),
            subject: formData.get("subject"),
            message: formData.get("message"),
        };

        try {
            const response = await fetch("/api/support", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                        "Unable to send support request."
                );
            }

            if (status) {
                status.textContent =
                    result.message ||
                    "Your support request has been sent.";

                status.className =
                    "support-form-status support-form-success";
            }

            form.reset();
        } catch (error) {
            console.error(error);

            if (status) {
                status.textContent =
                    error.message ||
                    "Something went wrong. Please try again.";

                status.className =
                    "support-form-status support-form-error";
            }
        } finally {
            if (submitButton) {
                submitButton.disabled = false;

                submitButton.textContent =
                    submitButton.dataset.originalText ||
                    "Send request";
            }
        }
    });
});
