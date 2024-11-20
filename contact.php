<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Sanitize inputs
    $name = htmlspecialchars(strip_tags(trim($_POST['name'])));
    $message = htmlspecialchars(strip_tags(trim($_POST['message'])));
    
    // Email details
    $to = "gamingevolutioncentre@gmail.com"; // Replace with your email address
    $subject = "New Contact Message from $name";
    $body = "Name: $name\n\nMessage:\n$message";
    $headers = "From: noreply@gamingevolutioncentre.com"; // Replace with your domain

    // Send email
    if (mail($to, $subject, $body, $headers)) {
        echo "Message sent successfully!";
    } else {
        echo "Failed to send message. Please try again later.";
    }
} else {
    echo "Invalid request.";
}
?>
