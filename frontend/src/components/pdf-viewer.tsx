"use client";

export default function PDFViewer({ pdfUrl }: { pdfUrl: string }) {
  const viewerUrl = `/pdfjs/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`;

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <iframe
        title="PDF Viewer"
        src={viewerUrl}
        style={{ width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
}
