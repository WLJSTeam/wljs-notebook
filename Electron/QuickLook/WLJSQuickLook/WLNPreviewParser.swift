import Foundation

struct WLNPreviewCell {
    let type: String
    let display: String?
    let hidden: Bool
    let source: String
}

enum WLNPreviewError: LocalizedError {
    case unreadableFile
    case cellsSectionNotFound

    var errorDescription: String? {
        switch self {
        case .unreadableFile:
            return "The notebook could not be read as UTF-8 text."
        case .cellsSectionNotFound:
            return "The notebook does not contain a Cells section."
        }
    }
}

struct WLNPreviewParser {
    private static let cellsStart = "%Cells%"
    private static let cellsEnd = "%EndOfCells%"
    private static let readChunkSize = 64 * 1024
    private static let maximumCellsSize = 16 * 1024 * 1024

    private static let cellSeparator = try! NSRegularExpression(
        pattern: #"(?m)^%-{20,}%[\t ]*(?:\r?\n|$)"#
    )

    private static let encodedDecoration = try! NSRegularExpression(
        pattern: #"\(\*\"1:[A-Za-z0-9+/=\r\n]+\"\*\)"#
    )

    private static let wrapperDecoration = try! NSRegularExpression(
        pattern: #"\(\*(?:[A-Za-z]+\[|\][A-Za-z]+)\*\)"#
    )

    static func parse(fileURL: URL) throws -> [WLNPreviewCell] {
        let section = try readCellsSection(fileURL: fileURL)
        return parse(cellsSection: section)
    }

    static func parse(cellsSection: String) -> [WLNPreviewCell] {
        let range = NSRange(cellsSection.startIndex..., in: cellsSection)
        let chunks = cellSeparator
            .stringByReplacingMatches(in: cellsSection, range: range, withTemplate: "\u{001E}")
            .components(separatedBy: "\u{001E}")

        var cells: [WLNPreviewCell] = []
        var index = 0

        while index + 1 < chunks.count {
            let metadata = chunks[index]
            let source = chunks[index + 1].trimmingCharacters(in: .whitespacesAndNewlines)
            index += 2

            guard let type = metadataValue(named: "Type", in: metadata), !source.isEmpty else {
                continue
            }

            cells.append(WLNPreviewCell(
                type: type,
                display: metadataValue(named: "Display", in: metadata),
                hidden: metadataBool(named: "Hidden", in: metadata),
                source: stripEditorDecorations(from: source)
            ))
        }

        return cells
    }

    static func makeHTML(fileURL: URL) throws -> String {
        let cells = try parse(fileURL: fileURL).filter { !$0.hidden }
        let title = escapeHTML(fileURL.deletingPathExtension().lastPathComponent)
        let body = cells.map(render).joined(separator: "\n")

        return """
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            :root { color-scheme: light dark; }
            * { box-sizing: border-box; }
            body {
              margin: 0 auto;
              max-width: 920px;
              padding: 34px 42px 64px;
              font: 15px/1.55 -apple-system, BlinkMacSystemFont, sans-serif;
              color: #1d1d1f;
              background: #fff;
            }
            header { margin-bottom: 28px; border-bottom: 1px solid #d2d2d7; }
            h1 { margin: 0 0 18px; font-size: 28px; line-height: 1.2; }
            h2 { margin-top: 1.5em; font-size: 22px; }
            h3 { margin-top: 1.4em; font-size: 18px; }
            .cell { margin: 14px 0; }
            .input, .output {
              margin: 0;
              padding: 12px 14px;
              overflow-wrap: anywhere;
              white-space: pre-wrap;
              border-radius: 8px;
              font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
            }
            .input { background: #f5f5f7; }
            .output { border-left: 3px solid #c7c7cc; }
            .label { margin: 0 0 5px; opacity: .55; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
            p { margin: .7em 0; }
            a { color: #06c; }
            @media (prefers-color-scheme: dark) {
              body { color: #f5f5f7; background: #1c1c1e; }
              header { border-color: #48484a; }
              .input { background: #2c2c2e; }
              .output { border-color: #636366; }
              a { color: #69a9ff; }
            }
          </style>
        </head>
        <body>
          <header><h1>\(title)</h1></header>
          \(body.isEmpty ? "<p>No visible cells found.</p>" : body)
        </body>
        </html>
        """
    }

    private static func readCellsSection(fileURL: URL) throws -> String {
        let handle = try FileHandle(forReadingFrom: fileURL)
        defer { try? handle.close() }

        let startData = Data(cellsStart.utf8)
        let endData = Data(cellsEnd.utf8)
        var buffer = Data()
        var startOffset: Int?

        while buffer.count < maximumCellsSize {
            guard let chunk = try handle.read(upToCount: readChunkSize), !chunk.isEmpty else { break }
            buffer.append(chunk)

            if startOffset == nil, let startRange = buffer.range(of: startData) {
                startOffset = startRange.upperBound
            }

            if let startOffset,
               let endRange = buffer.range(of: endData, options: [], in: startOffset..<buffer.endIndex) {
                guard let section = String(data: buffer[startOffset..<endRange.lowerBound], encoding: .utf8) else {
                    throw WLNPreviewError.unreadableFile
                }
                return section
            }
        }

        throw WLNPreviewError.cellsSectionNotFound
    }

    private static func metadataValue(named name: String, in metadata: String) -> String? {
        let escapedName = NSRegularExpression.escapedPattern(for: name)
        let expression = try! NSRegularExpression(pattern: "(?m)^\\s*\(escapedName):\\s*(.+?)\\s*$")
        let range = NSRange(metadata.startIndex..., in: metadata)

        guard let match = expression.firstMatch(in: metadata, range: range),
              let valueRange = Range(match.range(at: 1), in: metadata) else {
            return nil
        }

        return String(metadata[valueRange])
    }

    private static func metadataBool(named name: String, in metadata: String) -> Bool {
        let escapedName = NSRegularExpression.escapedPattern(for: name)
        let expression = try! NSRegularExpression(pattern: "(?m)^\\s*\(escapedName):\\s*(true|false)\\s*$", options: .caseInsensitive)
        let range = NSRange(metadata.startIndex..., in: metadata)

        guard let match = expression.firstMatch(in: metadata, range: range),
              let valueRange = Range(match.range(at: 1), in: metadata) else {
            return false
        }

        return metadata[valueRange].lowercased() == "true"
    }

    private static func stripEditorDecorations(from source: String) -> String {
        var result = source
        var range = NSRange(result.startIndex..., in: result)
        result = encodedDecoration.stringByReplacingMatches(in: result, range: range, withTemplate: "")

        range = NSRange(result.startIndex..., in: result)
        result = wrapperDecoration.stringByReplacingMatches(in: result, range: range, withTemplate: "")

        result = result
            .replacingOccurrences(of: "(*,*)", with: "")
            .replacingOccurrences(of: "(*|*)", with: "")

        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func render(cell: WLNPreviewCell) -> String {
        if cell.display?.lowercased() == "markdown" {
            return "<section class=\"cell markdown\">\(renderMarkdown(cell.source))</section>"
        }

        let cssClass = cell.type.lowercased() == "input" ? "input" : "output"
        return """
        <section class="cell">
          <div class="label">\(escapeHTML(cell.type))</div>
          <pre class="\(cssClass)">\(escapeHTML(cell.source))</pre>
        </section>
        """
    }

    private static func renderMarkdown(_ markdown: String) -> String {
        var rendered: [String] = []
        var paragraph: [String] = []

        func flushParagraph() {
            guard !paragraph.isEmpty else { return }
            rendered.append("<p>\(paragraph.map(escapeHTML).joined(separator: "<br>"))</p>")
            paragraph.removeAll(keepingCapacity: true)
        }

        for line in markdown.split(separator: "\n", omittingEmptySubsequences: false).map(String.init) {
            if line.hasPrefix("### ") {
                flushParagraph()
                rendered.append("<h3>\(escapeHTML(String(line.dropFirst(4))))</h3>")
            } else if line.hasPrefix("## ") {
                flushParagraph()
                rendered.append("<h2>\(escapeHTML(String(line.dropFirst(3))))</h2>")
            } else if line.hasPrefix("# ") {
                flushParagraph()
                rendered.append("<h2>\(escapeHTML(String(line.dropFirst(2))))</h2>")
            } else if line.trimmingCharacters(in: .whitespaces).isEmpty {
                flushParagraph()
            } else {
                paragraph.append(line)
            }
        }

        flushParagraph()
        return rendered.joined(separator: "\n")
    }

    private static func escapeHTML(_ text: String) -> String {
        text
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&#39;")
    }
}
