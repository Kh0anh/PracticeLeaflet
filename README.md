# PracticeLeaflet

Ứng dụng React trực quan hóa mạng lộ trình với Leaflet, cho phép bạn thiết kế tuyến giao hàng/di chuyển dựa trên tập điểm chuẩn, tự thêm điểm mới trên bản đồ và xem hướng dẫn chi tiết bằng tiếng Việt. Ứng dụng hoạt động hoàn toàn trên trình duyệt, tận dụng OSRM (Open Source Routing Machine) để tìm đường chính xác, đồng thời luôn có phương án dự phòng khi dịch vụ định tuyến không sẵn sàng.

## Tính năng chính
- **Bản đồ tương tác (Leaflet + react-leaflet):** hiển thị các điểm dừng, điểm bắt/đích cùng polyline lộ trình với marker tùy biến.
- **Quản lý điểm dừng:** thêm, xóa, sắp xếp lại bằng drag buttons; có thể thêm điểm mới từ danh sách cấu hình hoặc từ tọa độ click trên bản đồ.
- **Context menu thông minh:** click trên bản đồ để xem thông tin tọa độ, tạo cửa hàng mới, thêm điểm dừng hoặc lấy tuyến gần nhất đến điểm hiện tại, với giao diện tooltip có mũi nhọn bám theo vị trí chuột.
- **Hướng dẫn chi tiết:** mỗi chặng có danh sách bước với biểu tượng mặc định (Material UI) tương ứng kiểu maneuver, mô tả tiếng Việt được biên dịch trực tiếp từ dữ liệu OSRM.
- **Tổng hợp lộ trình:** hiển thị tổng quãng đường/thời gian cùng từng đoạn màu sắc riêng để dễ phân tích.

## Kiến trúc & công nghệ
- **Frontend:** React 19 + Vite, sử dụng hooks (useState/useMemo/useEffect) cho state cục bộ.
- **UI:** Material UI (MUI) cho layout, biểu tượng và tooltip.
- **Bản đồ:** Leaflet 1.9 với react-leaflet 5.0 – sử dụng tile nền OSM mặc định.
- **Định tuyến:** gọi API `https://router.project-osrm.org/route/v1/driving/...` với tùy chọn `steps=true`, `geometries=geojson`.
- **Xử lý chỉ đường:** `osrm-text-instructions` để biên dịch văn bản hướng dẫn chuẩn, fallback sang mô tả tùy chỉnh khi thiếu dữ liệu.

## Giải thuật tìm đường
Ứng dụng kết hợp cả kết quả từ OSRM và phép tính nội bộ để đảm bảo luôn có lộ trình:

1. **Chuẩn hóa đầu vào:** danh sách điểm dừng được lấy từ `MAP_CONFIG` và các điểm tùy biến người dùng thêm. Mỗi điểm có id, tên, mô tả và tọa độ `[lat, lon]`.
2. **Gọi OSRM khi đủ ≥2 điểm:**
   - Xây chuỗi truy vấn `lon,lat;...`.
   - Gọi API với `steps=true` để lấy từng bước (maneuver, geometry, distance, duration) cho mỗi leg.
   - Nếu thành công, lưu: `legs`, `distanceKm`, `durationMinutes`, `geometry`.
3. **Dựng segment từ legs (`buildSegmentsFromLegs`):**
   - Với mỗi cặp điểm liên tiếp, lấy leg tương ứng.
   - Tính quãng đường & thời gian thực tế từ OSRM.
   - Hợp nhất hình học từ các step để vẽ polyline riêng cho đoạn đó.
   - Sinh danh sách instruction: mỗi step → text (từ OSRM hoặc fallback) + nhãn khoảng cách.
4. **Biên dịch văn bản hướng dẫn:**
   - Ưu tiên `maneuver.instruction` (nếu OSRM cung cấp).
   - Nếu thiếu, dùng `osrm-text-instructions` với ngôn ngữ `vi`.
   - Cuối cùng fallback sang hàm tự mô tả (ví dụ “Rẽ trái vào ...”).
5. **Phương án dự phòng (`buildFallbackSegments`):**
   - Khi OSRM lỗi hoặc không đủ dữ liệu, hệ thống dùng công thức Haversine để ước lượng khoảng cách giữa cặp điểm, mặc định tốc độ 45 km/h để suy ra thời gian.
   - Polyline fallback chỉ là đoạn thẳng nối hai điểm.
6. **Tổng hợp (`getRouteTotals`):** cộng dồn quãng đường và thời gian của các segment (OSRM hoặc fallback) để hiển thị ở bảng điều khiển.

Thuật toán vì thế luôn “tự chữa”: nếu API không phản hồi, người dùng vẫn thấy quãng đường ước lượng để tiếp tục lập kế hoạch.

## Cấu trúc thư mục
```
├── src/
│   ├── App.jsx                # Thành phần gốc, quản lý state tuyến & gọi OSRM
│   ├── App.css                # Styling toàn cục
│   ├── assets/                # Icon marker PNG
│   ├── components/
│   │   ├── MapView.jsx        # Bản đồ, marker, context menu, polyline
│   │   ├── Sidebar.jsx        # Quản lý điểm dừng, chi tiết tuyến, instructions
│   │   └── AddStopDialog.jsx  # Hộp thoại tạo điểm mới
│   ├── config/mapConfig.js    # Điểm base và danh sách cửa hàng mẫu
│   └── utils/routeUtils.js    # Haversine, formatter, build segment & instructions
├── package.json
└── vite.config.{js/ts}
```

## Chạy dự án
Yêu cầu: Node.js ≥ 18.

```bash
npm install        # cài dependencies
npm run dev        # chạy Vite dev server (http://localhost:5173 mặc định)
npm run build      # build production
npm run preview    # xem thử bản build
npm run lint       # kiểm tra lint theo eslint config
```

## Tùy biến
- **Thêm điểm mặc định:** chỉnh `MAP_CONFIG.stops`.
- **Ngôn ngữ hướng dẫn:** đổi `INSTRUCTION_LANGUAGE` trong `src/utils/routeUtils.js`.
- **Tốc độ mặc định fallback:** `DEFAULT_SPEED_KMH` trong `routeUtils`.
- **Kiểu icon instruction:** map trong `Sidebar.jsx` (`modifierIconMap`) + logic `getInstructionIconComponent`.

## Hướng phát triển
- Điều chỉnh context menu để tự động đổi hướng mũi nhọn/bố cục khi gần mép màn hình.
- Lưu/tải tuyến về backend hoặc localStorage.
- Hỗ trợ nhiều profile lái xe (xe máy, xe tải) bằng cách đổi endpoint OSRM hoặc host riêng.
- Thêm phân tích chi phí (nhiên liệu, thời gian dừng).

---

README này tóm tắt kiến trúc, tính năng và giải thuật, có thể dùng trực tiếp cho báo cáo dự án. Nếu cần thêm sơ đồ hoặc ảnh chụp màn hình, có thể bổ sung vào phần cuối file.
