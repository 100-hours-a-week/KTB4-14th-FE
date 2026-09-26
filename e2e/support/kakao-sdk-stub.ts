/**
 * 카카오 지도 JS SDK 대역(stub).
 * 실제 SDK 대신 로드되어 지도/마커/경로선 생성 횟수를 window.__kakaoCalls 에 기록한다.
 * → "지도 위에 장소 마커와 경로선이 그려졌는가"를 외부 네트워크 없이 검증할 수 있다.
 */
export const KAKAO_SDK_STUB = `
(function () {
  var calls = (window.__kakaoCalls = { maps: 0, markers: 0, overlays: 0, polylines: 0, polylinePoints: 0 });
  function LatLng(lat, lng) { this.lat = lat; this.lng = lng; }
  LatLng.prototype.getLat = function () { return this.lat; };
  LatLng.prototype.getLng = function () { return this.lng; };
  function LatLngBounds() {}
  LatLngBounds.prototype.extend = function () {};
  function KMap(el) { calls.maps++; el.setAttribute('data-e2e-kakao-map', 'ready'); }
  KMap.prototype.setCenter = function () {};
  KMap.prototype.setBounds = function () {};
  function counted(key, onCreate) {
    function Ctor(options) { calls[key]++; this._on = true; if (onCreate) onCreate(options); }
    Ctor.prototype.setMap = function (map) {
      if (map === null && this._on) { this._on = false; calls[key]--; }
    };
    return Ctor;
  }
  window.kakao = {
    maps: {
      load: function (cb) { setTimeout(cb, 0); },
      Map: KMap,
      LatLng: LatLng,
      LatLngBounds: LatLngBounds,
      Marker: counted('markers'),
      CustomOverlay: counted('overlays'),
      Polyline: counted('polylines', function (o) { calls.polylinePoints = (o.path || []).length; }),
      event: { addListener: function () {} },
    },
  };
})();
`;
