export function matchAll(text: string, regex: RegExp): RegExpExecArray[] {
    const matches: RegExpExecArray[] = [];

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
        matches.push(match);
    }

    return matches;
}

export function mergeObjects<TAObject extends object, TBObject extends object>(a: TAObject, b: TBObject): TAObject & TBObject {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: { [key: string]: unknown } = a as any;

    for (const key of Object.keys(b)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (b as any)[key];
        if (value == null) {
            continue;
        }

        result[key] = value;
    }

    return result as TAObject & TBObject;
}
