import Foundation

@main
struct ParserSmokeTest {
    static func main() throws {
        guard CommandLine.arguments.count >= 2 else {
            throw TestError("Expected at least one .wln or .wlw fixture path")
        }

        let fileURL = URL(fileURLWithPath: CommandLine.arguments[1])
        let cells = try WLNPreviewParser.parse(fileURL: fileURL)

        try expect(!cells.isEmpty, "No cells were parsed")
        try expect(cells.contains { $0.display == "markdown" }, "No markdown cell was parsed")
        try expect(
            cells.contains { $0.source.contains("Plot[((1)/(x)), {x,0,1}]") },
            "Fraction-box decorations were not removed"
        )
        try expect(
            cells.contains { $0.source.contains("Power[E,-t]") },
            "Special-character-box decorations were not removed"
        )
        try expect(
            cells.allSatisfy { !$0.source.contains("1:eJ") },
            "Compressed editor decorations remain"
        )
        try expect(
            cells.allSatisfy { !$0.source.contains("(*FB[") && !$0.source.contains("(*VB[") },
            "Editor wrapper decorations remain"
        )
        try expect(
            cells.allSatisfy { !$0.source.contains("%---------") },
            "End-of-cells marker remains in cell output"
        )

        let oversizedOutput = String(repeating: "generated-javascript;", count: 1_000)
        let oversizedSection = """
        Type: Output
        %-------------------------------------------------------------------------%
        \(oversizedOutput)
        """
        let truncatedCells = WLNPreviewParser.parse(cellsSection: oversizedSection)
        try expect(truncatedCells.count == 1, "Oversized output fixture was not parsed")
        try expect(
            truncatedCells[0].source.contains("Quick Look preview truncated"),
            "Oversized output was not truncated"
        )
        try expect(
            truncatedCells[0].source.count < oversizedOutput.count,
            "Truncated output is not smaller than its source"
        )

        let mixedMarkup = WLNPreviewParser.renderMarkdown(
            "## Fe<sup>2</sup>Mo<sub >3</sub>O<sub>8</sub> <mark class=\"phase\">phase</mark> <img src=\"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==\" onerror=\"alert('unsafe')\"> <script>alert('unsafe')</script>"
        )
        try expect(
            mixedMarkup.contains("<h2>Fe<sup>2</sup>Mo<sub >3</sub>O<sub>8</sub>"),
            "Inline subscript and superscript HTML was not rendered inside Markdown"
        )
        try expect(
            mixedMarkup.contains("<mark class=\"phase\">phase</mark>"),
            "General inline HTML was not preserved inside Markdown"
        )
        try expect(!mixedMarkup.contains("<script"), "A script tag was rendered")
        try expect(!mixedMarkup.contains("alert("), "Executable inline HTML was preserved")
        try expect(!mixedMarkup.contains("onerror="), "An event-handler attribute was preserved")

        let html = try WLNPreviewParser.makeHTML(fileURL: fileURL)
        try expect(html.contains("Data Visualization"), "Rendered HTML is missing notebook content")
        try expect(!html.contains("%Objects%"), "Rendered HTML contains the Objects section")
        try expect(!html.contains("border-left"), "Rendered output still contains the left-border decoration")
        try expect(!html.contains("class=\"label\""), "Rendered cells still contain type labels")

        print("Parsed \(cells.count) cells and rendered \(html.utf8.count) bytes of HTML")

        for fixturePath in CommandLine.arguments.dropFirst(2) {
            let fixtureURL = URL(fileURLWithPath: fixturePath)
            let fixtureCells = try WLNPreviewParser.parse(fileURL: fixtureURL)
            let fixtureHTML = try WLNPreviewParser.makeHTML(fileURL: fixtureURL)
            try expect(!fixtureCells.isEmpty, "No cells were parsed from \(fixturePath)")
            try expect(!fixtureHTML.contains("%Objects%"), "Rendered HTML contains Objects for \(fixturePath)")
            print("Parsed \(fixtureCells.count) cells from \(fixtureURL.lastPathComponent)")
        }
    }

    private static func expect(_ condition: @autoclosure () -> Bool, _ message: String) throws {
        if !condition() { throw TestError(message) }
    }
}

struct TestError: LocalizedError {
    let message: String

    init(_ message: String) {
        self.message = message
    }

    var errorDescription: String? { message }
}
