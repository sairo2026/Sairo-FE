export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

const DOCUMENT_MIME = ["application/pdf", "image/jpeg", "image/png"];
const DOCUMENT_EXTENSION = /\.(pdf|jpe?g|png)$/i;

export function validateDocumentFile(file: File | null): string | undefined {
  if (file === null) return "올릴 파일을 선택해 주세요.";
  const typeOk = DOCUMENT_MIME.includes(file.type) || DOCUMENT_EXTENSION.test(file.name);
  if (!typeOk) return "PDF, JPG, PNG 파일만 올릴 수 있습니다.";
  if (file.size > DOCUMENT_MAX_BYTES) return "파일은 한 개에 20MB 이하여야 합니다.";
  return undefined;
}

export type DocumentFormValues = {
  documentType: string;
  writtenDate: string;
  deliveredDate: string;
  datePendingReason: string;
  piiReviewed: boolean;
  piiMaskingConfirmed: boolean;
};

export function validateDocumentForm(
  values: DocumentFormValues,
  file: File | null,
  options: { needsType: boolean },
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (options.needsType && values.documentType === "") {
    errors.documentType = "서류 종류를 선택해 주세요.";
  }
  const fileProblem = validateDocumentFile(file);
  if (fileProblem) errors.file = fileProblem;
  const datesKnown = values.writtenDate !== "" && values.deliveredDate !== "";
  if (!datesKnown && values.datePendingReason.trim() === "") {
    errors.datePendingReason =
      "작성일과 교부일을 모두 입력하거나 날짜를 확인하지 못한 사유를 입력해 주세요.";
  }
  if (!values.piiReviewed) {
    errors.piiReviewed = "주민등록번호 등 포함 여부를 확인했는지 체크해 주세요.";
  }
  return errors;
}

export function toDocumentForm(
  values: DocumentFormValues,
  file: File,
  contractRevisionId: number,
  includeType: boolean,
): FormData {
  const form = new FormData();
  form.set("contractRevisionId", String(contractRevisionId));
  if (includeType) form.set("documentType", values.documentType);
  if (values.writtenDate !== "") form.set("writtenDate", values.writtenDate);
  if (values.deliveredDate !== "") form.set("deliveredDate", values.deliveredDate);
  if (values.datePendingReason.trim() !== "") {
    form.set("datePendingReason", values.datePendingReason.trim());
  }
  form.set("piiReviewed", String(values.piiReviewed));
  form.set("piiMaskingConfirmed", String(values.piiMaskingConfirmed));
  form.set("file", file);
  return form;
}
