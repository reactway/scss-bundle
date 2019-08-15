export function matchAll(text: string, regex: RegExp): RegExpExecArray[] {
    const matches: RegExpExecArray[] = [];

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
        matches.push(match);
    }

    return matches;
}
