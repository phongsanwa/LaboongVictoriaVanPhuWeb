import React from "react";
import { Header } from "zmp-ui";
import { Ico } from "./icons";

/** Thanh tiêu đề màu thương hiệu; trang con có nút quay lại. */
export function PageHeader({ title, back = true }: { title: string; back?: boolean }) {
  return (
    <>
      <Header title={title} showBackIcon={back} backgroundColor="#0F623F" textColor="white"
        backIcon={<Ico name="left" size={24} color="#fff" />} />
      {/* Header của zmp-ui là position: fixed → chừa chỗ để nội dung không bị che */}
      <div style={{ height: "var(--header-h)" }} />
    </>
  );
}
