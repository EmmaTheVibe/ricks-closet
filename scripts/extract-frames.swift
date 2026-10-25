// Extracts still frames from a video (macOS, uses AVFoundation — no ffmpeg needed).
// Usage: swift scripts/extract-frames.swift <video> <out-dir> <start-s> <end-s> [step-s=0.0333]
// Files are named f<time>.jpg so they sort by time.
import AVFoundation
import AppKit

let args = CommandLine.arguments
guard args.count >= 5 else {
  print("Usage: swift scripts/extract-frames.swift <video> <out-dir> <start-s> <end-s> [step-s]")
  exit(1)
}
let generator = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: args[1])))
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero
let out = args[2]
try? FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)
let end = Double(args[4])!
let step = args.count > 5 ? Double(args[5])! : 1.0 / 30
var time = Double(args[3])!
var count = 0
while time <= end + 1e-6 {
  if let image = try? generator.copyCGImage(at: CMTime(seconds: time, preferredTimescale: 600), actualTime: nil),
     let jpeg = NSBitmapImageRep(cgImage: image).representation(using: .jpeg, properties: [.compressionFactor: 0.92]) {
    try! jpeg.write(to: URL(fileURLWithPath: String(format: "%@/f%07.3f.jpg", out, time)))
    count += 1
  }
  time += step
}
print("wrote \(count) frames to \(out)")
