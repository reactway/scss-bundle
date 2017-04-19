export function getAllMatches(text: string, regex: RegExp): RegExpExecArray[] {
    let matches: RegExpExecArray[] = [];
    let match: RegExpExecArray;
    while (match = regex.exec(text) as RegExpExecArray) {
        matches.push(match);
    }
    return matches;
}
