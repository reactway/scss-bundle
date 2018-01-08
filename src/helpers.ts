export function getAllMatches(text: string, regex: RegExp): RegExpExecArray[] {
    const matches: RegExpExecArray[] = [];
    let match: RegExpExecArray;
    while (match = regex.exec(text)) {
        matches.push(match);
    }
    return matches;
}
