export const RESET_PASSWORD_EMAIL_TEMPLATE = (resetPasswordLink: string) => `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetPasswordLink}">Reset Password</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
`;

