export type EmailConfig = {
    from: string;
    to: string;
    subject: string;
    html: string;
};

export type ResetToken = {
    token: string;
    expires: Date;
};