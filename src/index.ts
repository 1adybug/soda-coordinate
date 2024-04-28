import robustSegmentIntersect from "robust-segment-intersect"

export type CoordType = "WGS84" | "GCJ02" | "BD09"

export type CoordBase = {
    type: CoordType
    longitude: number
    latitude: number
}

export class Coord implements CoordBase {
    type: CoordType
    longitude: number
    latitude: number
    constructor({ type, longitude, latitude }: CoordBase) {
        this.type = type
        this.longitude = longitude
        this.latitude = latitude
    }
    getWGS84(): Coord {
        switch (this.type) {
            case "GCJ02":
                const [longitude, latitude] = GCJ02ToWGS84([this.longitude, this.latitude])
                return new Coord({ type: "WGS84", longitude, latitude })
            case "BD09":
                const [longitude1, latitude1] = BD09ToWGS84([this.longitude, this.latitude])
                return new Coord({ type: "WGS84", longitude: longitude1, latitude: latitude1 })
            default:
                return this
        }
    }
    getGCJ02(): Coord {
        switch (this.type) {
            case "WGS84":
                const [longitude, latitude] = WGS84ToGCJ02([this.longitude, this.latitude])
                return new Coord({ type: "GCJ02", longitude, latitude })
            case "BD09":
                const [longitude1, latitude1] = BD09ToGCJ02([this.longitude, this.latitude])
                return new Coord({ type: "GCJ02", longitude: longitude1, latitude: latitude1 })
            default:
                return this
        }
    }
    getBD09(): Coord {
        switch (this.type) {
            case "WGS84":
                const [longitude, latitude] = WGS84ToBD09([this.longitude, this.latitude])
                return new Coord({ type: "BD09", longitude, latitude })
            case "GCJ02":
                const [longitude1, latitude1] = GCJ02ToBD09([this.longitude, this.latitude])
                return new Coord({ type: "BD09", longitude: longitude1, latitude: latitude1 })
            default:
                return this
        }
    }
}

const x_PI = (3.14159265358979324 * 3000.0) / 180.0
const PI = 3.1415926535897932384626
const ee = 0.00669342162296594323

/** 地球半径 ，单位米*/
export const EarthRadius = 6378245.0

/**
 * getCoordinateOffset 获取火星坐标系(GCJ-02)坐标与地球坐标系(WGS84)坐标的偏移量
 * @param {[number, number]} coordinate 火星坐标系(GCJ-02)坐标
 */
function getCoordinateOffset(coordinate: [number, number]): [number, number] {
    const [longitude, latitude] = coordinate
    let dLng = 300.0 + longitude + 2.0 * latitude + 0.1 * longitude * longitude + 0.1 * longitude * latitude + 0.1 * Math.sqrt(Math.abs(longitude))
    dLng += ((20.0 * Math.sin(6.0 * longitude * PI) + 20.0 * Math.sin(2.0 * longitude * PI)) * 2.0) / 3.0
    dLng += ((20.0 * Math.sin(longitude * PI) + 40.0 * Math.sin((longitude / 3.0) * PI)) * 2.0) / 3.0
    dLng += ((150.0 * Math.sin((longitude / 12.0) * PI) + 300.0 * Math.sin((longitude / 30.0) * PI)) * 2.0) / 3.0
    let dLat = -100.0 + 2.0 * longitude + 3.0 * latitude + 0.2 * latitude * latitude + 0.1 * longitude * latitude + 0.2 * Math.sqrt(Math.abs(longitude))
    dLat += ((20.0 * Math.sin(6.0 * longitude * PI) + 20.0 * Math.sin(2.0 * longitude * PI)) * 2.0) / 3.0
    dLat += ((20.0 * Math.sin(latitude * PI) + 40.0 * Math.sin((latitude / 3.0) * PI)) * 2.0) / 3.0
    dLat += ((160.0 * Math.sin((latitude / 12.0) * PI) + 320 * Math.sin((latitude * PI) / 30.0)) * 2.0) / 3.0
    return [dLng, dLat]
}

/**
 * 判断坐标是否在中国范围内
 * @param {[number, number]} coordinate 坐标
 */
export function inChina(coordinate: [number, number]): boolean {
    /** 大陆 */
    const region: [number, number][][] = [
        [
            [79.4462, 49.2204],
            [96.33, 42.8899]
        ],
        [
            [109.6872, 54.1415],
            [135.0002, 39.3742]
        ],
        [
            [73.1246, 42.8899],
            [124.143255, 29.5297]
        ],
        [
            [82.9684, 29.5297],
            [97.0352, 26.7186]
        ],
        [
            [97.0253, 29.5297],
            [124.367395, 20.414096]
        ],
        [
            [107.975793, 20.414096],
            [111.744104, 17.871542]
        ]
    ]

    /** 台湾未做偏移 */
    const exclude: [number, number][][] = [
        [
            [119.921265, 25.398623],
            [122.497559, 21.785006]
        ],
        [
            [101.8652, 22.284],
            [106.665, 20.0988]
        ],
        [
            [106.4525, 21.5422],
            [108.051, 20.4878]
        ],
        [
            [109.0323, 55.8175],
            [119.127, 50.3257]
        ],
        [
            [127.4568, 55.8175],
            [137.0227, 49.5574]
        ],
        [
            [131.2662, 44.8922],
            [137.0227, 42.5692]
        ]
    ]

    return region.some(item => inRectangle(coordinate, item[0], item[1])) && !exclude.some(item => inRectangle(coordinate, item[0], item[1]))
}

/**
 * 判断是否在范围内
 * @param {[number, number]} coordinate 坐标
 * @param {[number, number]} start 起点坐标
 * @param {[number, number]} end 终点坐标
 */
function inRectangle(coordinate: [number, number], start: [number, number], end: [number, number]): boolean {
    const [sLng, sLat] = start
    const [eLng, eLat] = end
    const [longitude, latitude] = coordinate
    const minLng = Math.min(sLng, eLng)
    const maxLng = Math.max(sLng, eLng)
    const minLat = Math.min(sLat, eLat)
    const maxLat = Math.max(sLat, eLat)
    return longitude >= minLng && longitude <= maxLng && latitude >= minLat && latitude <= maxLat
}

/**
 * WGS84ToGCJ02 地球坐标系(WGS84)转火星坐标系(GCJ-02)
 * @param {[number, number]} WGS84Coordinate WGS84坐标
 */
export function WGS84ToGCJ02(WGS84Coordinate: [number, number]): [number, number] {
    const [WGS84Longitude, WGS84Latitude] = WGS84Coordinate
    const x = WGS84Longitude - 105.0
    const y = WGS84Latitude - 35.0
    let [dLng, dLat] = getCoordinateOffset([x, y])
    const radLat = (WGS84Latitude / 180.0) * PI
    let magic = Math.sin(radLat)
    magic = 1 - ee * magic * magic
    const sqrtMagic = Math.sqrt(magic)
    dLng = (dLng * 180.0) / ((EarthRadius / sqrtMagic) * Math.cos(radLat) * PI)
    dLat = (dLat * 180.0) / (((EarthRadius * (1 - ee)) / (magic * sqrtMagic)) * PI)
    const GCJLongitude = WGS84Longitude + dLng
    const GCJLatitude = WGS84Latitude + dLat
    return [GCJLongitude, GCJLatitude]
}

/**
 * GCJ02ToWGS84 火星坐标系(GCJ-02)转地球坐标系(WGS84)
 * @param {[number, number]} GCJCoordinate 火星坐标系(GCJ-02)坐标
 */
export function GCJ02ToWGS84(GCJCoordinate: [number, number]): [number, number] {
    const [GCJLongitude, GCJLatitude] = GCJCoordinate
    const x = GCJLongitude - 105.0
    const y = GCJLatitude - 35.0
    let [dLng, dLat] = getCoordinateOffset([x, y])
    const radLat = (GCJLatitude / 180.0) * PI
    let magic = Math.sin(radLat)
    magic = 1 - ee * magic * magic
    const sqrtMagic = Math.sqrt(magic)
    dLng = (dLng * 180.0) / ((EarthRadius / sqrtMagic) * Math.cos(radLat) * PI)
    dLat = (dLat * 180.0) / (((EarthRadius * (1 - ee)) / (magic * sqrtMagic)) * PI)
    const WGS84Longitude = GCJLongitude - dLng
    const WGS84Latitude = GCJLatitude - dLat
    return [WGS84Longitude, WGS84Latitude]
}

/**
 * BD09ToGCJ02 百度坐标系(BD-09)转火星坐标系(GCJ-02)
 * @param {[number, number]} BDCoordinate 百度坐标系(BD-09)坐标
 */
export function BD09ToGCJ02(BDCoordinate: [number, number]): [number, number] {
    const [BDLongitude, BDLatitude] = BDCoordinate
    const x = BDLongitude - 0.0065
    const y = BDLatitude - 0.006
    const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_PI)
    const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_PI)
    const GCJLongitude = z * Math.cos(theta)
    const GCJLatitude = z * Math.sin(theta)
    return [GCJLongitude, GCJLatitude]
}

/**
 * GCJ02ToBD09 火星坐标系(GCJ-02)转百度坐标系(BD-09)
 * @param {[number, number]} GCJCoordinate 火星坐标系(GCJ-02)坐标
 */
export function GCJ02ToBD09(GCJCoordinate: [number, number]): [number, number] {
    const [GCJLongitude, GCJLatitude] = GCJCoordinate
    const z = Math.sqrt(GCJLongitude * GCJLongitude + GCJLatitude * GCJLatitude) + 0.00002 * Math.sin(GCJLatitude * x_PI)
    const theta = Math.atan2(GCJLatitude, GCJLongitude) + 0.000003 * Math.cos(GCJLongitude * x_PI)
    const BDLongitude = z * Math.cos(theta) + 0.0065
    const BDLatitude = z * Math.sin(theta) + 0.006
    return [BDLongitude, BDLatitude]
}

/**
 * BD09ToWGS84 百度坐标系(BD-09)转地球坐标系(WGS84)
 * @param {[number, number]} BDCoordinate 百度坐标系(BD-09)坐标
 */
export function BD09ToWGS84(BDCoordinate: [number, number]): [number, number] {
    return GCJ02ToWGS84(BD09ToGCJ02(BDCoordinate))
}

/**
 * WGS84ToBD09 地球坐标系(WGS84)转百度坐标系(BD-09)
 * @param {[number, number]} WGS84Coordinate WGS84坐标
 */
export function WGS84ToBD09(WGS84Coordinate: [number, number]): [number, number] {
    return GCJ02ToBD09(WGS84ToGCJ02(WGS84Coordinate))
}

/**
 * 获取两个经纬度坐标之间的距离
 * @param {[number, number]} coord1 - 经纬度一，[经度, 维度]
 * @param {[number, number]} coord2 - 经纬度二，[经度, 维度]
 * @returns {number} 距离：米
 */
export function getDistance(coord1: [number, number], coord2: [number, number]): number {
    function toRadians(d: number) {
        return (d * Math.PI) / 180
    }
    const [lng1, lat1] = coord1
    if (Math.abs(lng1) > 180) throw new Error(`${lng1} 不是一个有效的经度值`)
    if (Math.abs(lat1) > 90) throw new Error(`${lat1} 不是一个有效的纬度值`)
    const [lng2, lat2] = coord2
    if (Math.abs(lng2) > 180) throw new Error(`${lng2} 不是一个有效的经度值`)
    if (Math.abs(lat2) > 90) throw new Error(`${lat2} 不是一个有效的纬度值`)
    const radLat1 = toRadians(lat1)
    const radLat2 = toRadians(lat2)
    const deltaLat = radLat1 - radLat2
    const deltaLng = toRadians(lng1) - toRadians(lng2)
    const dis = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(deltaLat / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(deltaLng / 2), 2)))
    return dis * EarthRadius
}

/**
 * 判断两个线段是否相交
 * @param {[number, number][]} line1 - 线段一
 * @param {[number, number][]} line2 - 线段二
 */
export function ifTwoSegmentsIntersect(line1: [number, number][], line2: [number, number][]): boolean {
    const [a, b] = line1
    const [c, d] = line2
    return robustSegmentIntersect(a, b, c, d)
}

/**
 * 判断多个点能否围成多边形
 * @param {[number, number][]} coords - 多边形的顶点
 */
export function canCoordsBePolygon(coords: [number, number][]): boolean {
    const { length } = coords
    if (length < 3) return false
    const lines = coords.map((coord, index) => [coord, coords[(index + 1) % length]])
    for (let i = 0; i < length; i++) {
        for (let j = i + 2; j < length; j++) {
            if (i === 0 && j === length - 1) {
                continue
            }
            if (ifTwoSegmentsIntersect(lines[i], lines[j])) {
                return false
            }
        }
    }
    return true
}
