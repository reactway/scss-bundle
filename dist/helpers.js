Object.defineProperty(exports, "__esModule", { value: true });
function getAllMatches(text, regex) {
    let matches = [];
    let match;
    while (match = regex.exec(text)) {
        matches.push(match);
    }
    return matches;
}
exports.getAllMatches = getAllMatches;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9oZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSx1QkFBOEIsSUFBWSxFQUFFLEtBQWE7SUFDckQsSUFBSSxPQUFPLEdBQXNCLEVBQUUsQ0FBQztJQUNwQyxJQUFJLEtBQXNCLENBQUM7SUFDM0IsT0FBTyxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQW9CLEVBQUUsQ0FBQztRQUNqRCxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFDRCxNQUFNLENBQUMsT0FBTyxDQUFDO0FBQ25CLENBQUM7QUFQRCxzQ0FPQyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBnZXRBbGxNYXRjaGVzKHRleHQ6IHN0cmluZywgcmVnZXg6IFJlZ0V4cCk6IFJlZ0V4cEV4ZWNBcnJheVtdIHtcclxuICAgIGxldCBtYXRjaGVzOiBSZWdFeHBFeGVjQXJyYXlbXSA9IFtdO1xyXG4gICAgbGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXk7XHJcbiAgICB3aGlsZSAobWF0Y2ggPSByZWdleC5leGVjKHRleHQpIGFzIFJlZ0V4cEV4ZWNBcnJheSkge1xyXG4gICAgICAgIG1hdGNoZXMucHVzaChtYXRjaCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbWF0Y2hlcztcclxufVxyXG4iXX0=