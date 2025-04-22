
export type EnrollmentState = {
    userId: string;
    courseId: string;
    enrollmentDate: Date;
    lastAttemptDate: Date;
    isPassed: boolean;
    isCompleted: boolean;
    nextPossibleAttempt: Date | null;
};

export type SubmitAssignmentResult = {
    passed: boolean;
    correctAnswers: number;
    totalQuestions: number;
    minimumRequired: number;
};

export type SubmitAssignmentAnswers = {
    questionId: string;
    answer: string;
};

export type UpdateCountResult = {
    courseId: string;
    userId: string;
    delta: number;
};