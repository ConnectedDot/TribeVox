import type { ComparisonToken } from "../types/speech";
export function accuracy(tokens: ComparisonToken[]) {
    const attempted = tokens.filter(
        (t) => t.status === "correct" || t.status === "incorrect",
    );
    return attempted.length
        ? Math.round(
            (attempted.filter((t) => t.status === "correct").length /
                attempted.length) *
            100,
        )
        : 0;
}
export function progress(tokens: ComparisonToken[]) {
    return tokens.length
        ? Math.round(
            (tokens.filter(
                (t) =>
                    t.status === "correct" ||
                    t.status === "incorrect" ||
                    t.status === "interim",
            ).length /
                tokens.length) *
            100,
        )
        : 0;
}
