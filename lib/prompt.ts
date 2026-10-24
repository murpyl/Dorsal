/** Max length of the one-line question an instructor/TA pushes with the current concept. */
export const MAX_PROMPT_LENGTH = 200;
/** Max length of a student's answer to an open-ended prompt. */
export const MAX_RESPONSE_LENGTH = 500;
/** Max prompts pushed in one session. */
export const MAX_PROMPTS = 100;

export type PromptKind = "rating" | "open";
