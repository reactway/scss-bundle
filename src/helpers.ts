export function getMatches(string: string, regex: RegExp, index: number = 1) {
    let matches = new Array<string | Array<string>>();
    let match: RegExpExecArray;
    while (match = regex.exec(string) as RegExpExecArray) {
        if (index !== -1) {
            matches.push(match[index]);
        } else {
            matches.push(match);
        }
    }
    return matches;
}