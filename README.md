# Hệ thống Đặt lịch Khám bệnh (Medical Booking Appointment System)

## 1. Giới thiệu
Dự án **Booking Appointment** là một nền tảng hỗ trợ người dùng đặt lịch khám bệnh trực tuyến một cách nhanh chóng và thuận tiện. Hệ thống có chức năng tư vấn và hỗ trợ đặt lịch tự động, giúp tối ưu hóa quy trình tiếp nhận bệnh nhân cho các phòng khám.

Mục tiêu của dự án là giải quyết vấn đề quá tải tại các cơ sở y tế thông qua việc số hóa quy trình đăng ký và quản lý lịch hẹn.

## 2. Chức năng Chính (Features)

### Dành cho Người dùng (Bệnh nhân)
*   **Đăng ký & Đăng nhập**: Hệ thống xác thực người dùng an toàn.
*   **Tư vấn Đặt lịch**: Tương tác với trợ lý ảo để tìm kiếm phòng khám, chọn dịch vụ và đặt lịch hẹn thông minh.
*   **Thanh toán Online**: Hỗ trợ thanh toán phí khám trước (tích hợp cổng thanh toán).

### Dành cho Quản trị viên (Admin)
*   **Dashboard Thống kê**: Xem tổng quan số lượng lịch hẹn, doanh thu.
*   **Quản lý Lịch hẹn**: Theo dõi trạng thái và chi tiết lịch khám.
*   **Quản lý Thanh toán**: Theo dõi trạng thái các giao dịch.

## 3. Công nghệ Sử dụng (Technology Stack)

Dự án được xây dựng dựa trên các công nghệ hiện đại nhất:

*   **Frontend**:
    *   [Next.js 16](https://nextjs.org/) (App Router) - Framework React mạnh mẽ.
    *   [React 19](https://react.dev/) - Thư viện UI.
    *   [Tailwind CSS 4](https://tailwindcss.com/) - Styling framework utility-first.
    *   [Lucide React](https://lucide.dev/) - Bộ icon nhẹ và đẹp.
*   **Backend & Database**:
    *   [Supabase](https://supabase.com/) - Giải pháp Backend-as-a-Service (BaaS) mã nguồn mở thay thế Firebase.
    *   **PostgreSQL**: Cơ sở dữ liệu quan hệ mạnh mẽ.
    *   **Supabase Auth**: Xác thực người dùng.
*   **Ngôn ngữ**: [TypeScript](https://www.typescriptlang.org/) - Đảm bảo type-safe cho code.

## 4. Hướng dẫn Sử dụng (Usage Guide)

Để chạy dự án trên máy cục bộ, hãy làm theo các bước sau:

### Bước 1: Clone dự án
```bash
git clone <your-repo-link>
cd booking-appointment
```

### Bước 2: Cài đặt thư viện
```bash
npm install
```

### Bước 3: Cấu hình môi trường
Tạo file `.env` tại thư mục gốc và điền các thông tin cấu hình Supabase của bạn:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Các biến môi trường khác (nếu có)
```

### Bước 4: Chạy ứng dụng
Khởi chạy server phát triển:

```bash
npm run dev
```

Mở trình duyệt và truy cập: [http://localhost:3000](http://localhost:3000)

## 5. Demo
https://booking-clinic.vercel.app/

Admin: admin@clinicbooking.vn
Password: 123456
