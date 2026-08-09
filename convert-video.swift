import AVFoundation
import Foundation

// Usage: swift conv2.swift <in> <out.mp4> <targetHeight> <videoBitrate>
let args = CommandLine.arguments
guard args.count == 5, let targetH = Int(args[3]), let bitrate = Int(args[4]) else {
    print("usage: conv2.swift in out.mp4 height bitrate"); exit(1)
}
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: outURL)

let asset = AVURLAsset(url: inURL)
guard let track = asset.tracks(withMediaType: .video).first else { print("no video track"); exit(1) }
let nat = track.naturalSize.applying(track.preferredTransform)
let srcW = abs(nat.width), srcH = abs(nat.height)
let h = CGFloat(targetH)
let w = (srcW * h / srcH / 2).rounded() * 2
print(String(format: "source %.0fx%.0f -> %.0fx%.0f @ %d bps", srcW, srcH, w, h, bitrate))

let reader = try! AVAssetReader(asset: asset)
let readOut = AVAssetReaderTrackOutput(track: track, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange
])
reader.add(readOut)

let writer = try! AVAssetWriter(outputURL: outURL, fileType: .mp4)
let winput = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: Int(w),
    AVVideoHeightKey: Int(h),
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: bitrate,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoMaxKeyFrameIntervalKey: 90
    ]
])
winput.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: winput, sourcePixelBufferAttributes: nil)
writer.add(winput)

writer.startWriting()
reader.startReading()
writer.startSession(atSourceTime: .zero)

// scale via vImage-free route: use a CoreImage context
import CoreImage
let ci = CIContext()
var pool: CVPixelBufferPool?
CVPixelBufferPoolCreate(nil, nil, [
    kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
    kCVPixelBufferWidthKey: Int(w), kCVPixelBufferHeightKey: Int(h)
] as CFDictionary, &pool)

let queue = DispatchQueue(label: "conv")
let sem = DispatchSemaphore(value: 0)
var frames = 0

winput.requestMediaDataWhenReady(on: queue) {
    while winput.isReadyForMoreMediaData {
        guard let sample = readOut.copyNextSampleBuffer() else {
            winput.markAsFinished(); sem.signal(); return
        }
        guard let src = CMSampleBufferGetImageBuffer(sample) else { continue }
        let pts = CMSampleBufferGetPresentationTimeStamp(sample)
        var dst: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(nil, pool!, &dst)
        guard let dstBuf = dst else { continue }
        let img = CIImage(cvPixelBuffer: src).transformed(by: CGAffineTransform(scaleX: w / srcW, y: h / srcH))
        ci.render(img, to: dstBuf)
        adaptor.append(dstBuf, withPresentationTime: pts)
        frames += 1
    }
}
sem.wait()
writer.finishWriting {
    let size = (try? FileManager.default.attributesOfItem(atPath: outURL.path)[.size] as? Int) ?? 0
    print(String(format: "done: %d frames, %.2f MB", frames, Double(size ?? 0) / 1048576))
    exit(writer.status == .completed ? 0 : 1)
}
RunLoop.main.run()
