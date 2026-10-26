// Regenerate the reference fixture on macOS with Apple's public SwiftUI API.
// CLANG_MODULE_CACHE_PATH=/private/tmp/dd-swift-module-cache swift scripts/research/native-rounded-rectangle.swift
import SwiftUI
import Foundation

let sizes: [(CGFloat, CGFloat, CGFloat)] = [(416,316,28), (173,260,16), (180,120,16), (288,600,28)]
var cases: [[String: Any]] = []
for (width,height,radius) in sizes {
    let native = RoundedRectangle(cornerRadius: radius, style: .continuous)
        .path(in: CGRect(x:0,y:0,width:width,height:height))
    var elements: [[String: Any]] = []
    native.cgPath.applyWithBlock { pointer in
        let element=pointer.pointee
        let counts: [CGPathElementType:Int] = [.moveToPoint:1,.addLineToPoint:1,.addQuadCurveToPoint:2,.addCurveToPoint:3,.closeSubpath:0]
        elements.append(["type":element.type.rawValue,"points":(0..<(counts[element.type] ?? 0)).map { [Double(element.points[$0].x),Double(element.points[$0].y)] }])
    }
    cases.append(["width":Double(width),"height":Double(height),"radius":Double(radius),"elements":elements])
}
let output: [String:Any] = [
    "source":"SwiftUI.RoundedRectangle(cornerRadius:style:.continuous).path(in:).cgPath",
    "platform":ProcessInfo.processInfo.operatingSystemVersionString,
    "cases":cases
]
let data=try! JSONSerialization.data(withJSONObject:output,options:[.prettyPrinted,.sortedKeys])
print(String(data:data,encoding:.utf8)!)
