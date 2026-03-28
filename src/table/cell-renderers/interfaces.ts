import { RenderableValue } from '@dynamicforms/vue-forms';

export type RowValue = Record<string | symbol, any>;

export interface CellOptions {
  nullHandler?: string; // undefined (or null) means the renderer will handle null rendering itself
  transform?: (value: any, rowValue: RowValue) => any;
  preRender?: (value: any, rowValue: RowValue) => RenderableValue | string | null;
  postRender?: (value: any, rowValue: RowValue) => RenderableValue | string | null;
}

export const gridIdOption = Symbol('gridId');
export const columnNameOption = Symbol('columnName');
export const columnIdOption = Symbol('columnId');

interface CellOptionsInt {
  [gridIdOption]: symbol;
  [columnNameOption]: string;
  [columnIdOption]: symbol;

  redrawColumn: () => void; // will trigger column redraw
}

export type CellOptionsInternal<T extends CellOptions = CellOptions> = T & CellOptionsInt;

export type CellRendererTransformer<T extends CellOptions = CellOptions> = (
  value: any,
  rowValue: RowValue,
  options: CellOptionsInternal<T>,
) => RenderableValue;
