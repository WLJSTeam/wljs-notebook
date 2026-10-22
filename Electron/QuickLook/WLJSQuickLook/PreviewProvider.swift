import Cocoa
import QuickLookUI
import UniformTypeIdentifiers

final class PreviewProvider: QLPreviewProvider, QLPreviewingController {
    func providePreview(
        for request: QLFilePreviewRequest,
        completionHandler handler: @escaping (QLPreviewReply?, Error?) -> Void
    ) {
        do {
            let html = try WLNPreviewParser.makeHTML(fileURL: request.fileURL)
            let reply = QLPreviewReply(
                dataOfContentType: .html,
                contentSize: NSSize(width: 900, height: 1100)
            ) { _ in
                Data(html.utf8)
            }
            reply.title = request.fileURL.deletingPathExtension().lastPathComponent
            handler(reply, nil)
        } catch {
            handler(nil, error)
        }
    }
}
