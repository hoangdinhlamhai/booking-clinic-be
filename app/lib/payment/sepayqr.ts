export function generateSepayQR({
  bankCode,
  accountNo,
  amount,
  description,
}: {
  bankCode: string;
  accountNo: string;
  amount: number;
  description: string;
}) {
  return `https://qr.sepay.vn/img?bank=${bankCode}&acc=${accountNo}&amount=${amount}&des=${encodeURIComponent(
    description
  )}`;
}
