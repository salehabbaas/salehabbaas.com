declare module "xlsx-populate" {
  interface DataValidationOptions {
    type?: string;
    allowBlank?: boolean;
    formula1: string;
    formula2?: string;
    operator?: string;
    showInputMessage?: boolean;
    prompt?: string | false;
    promptTitle?: string;
    showErrorMessage?: boolean;
    error?: string;
    errorTitle?: string;
  }

  interface Cell {
    value(value: unknown): Cell;
  }

  interface Column {
    width(width: number): Column;
  }

  interface Range {
    dataValidation(validation: string | DataValidationOptions | null): Range;
  }

  interface Row {
    style(name: string, value: unknown): Row;
  }

  interface Sheet {
    name(name: string): Sheet;
    cell(address: string): Cell;
    column(columnNameOrNumber: string | number): Column;
    range(address: string): Range;
    row(rowNumber: number): Row;
  }

  interface Workbook {
    outputAsync(options?: string | { type?: string; password?: string }): Promise<Buffer | ArrayBuffer | Uint8Array | string>;
    sheet(sheetNameOrIndex: string | number): Sheet;
  }

  interface XlsxPopulateStatic {
    fromBlankAsync(): Promise<Workbook>;
  }

  const XlsxPopulate: XlsxPopulateStatic;
  export default XlsxPopulate;
}
