// ========================================
// ユーティリティ型定義
// ========================================

/**
 * オプショナルなフィールドを必須にする型
 */
export type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 特定のフィールドを除外する型
 */
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * 特定のフィールドだけを抽出する型
 */
export type PickRequired<T, K extends keyof T> = Required<Pick<T, K>>;

/**
 * ネストしたオブジェクトをすべてオプショナルにする型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * DateをISO文字列に変換する型
 */
export type SerializeDates<T> = {
  [K in keyof T]: T[K] extends Date 
    ? string 
    : T[K] extends Date | undefined 
    ? string | undefined 
    : T[K] extends Array<infer U>
    ? Array<SerializeDates<U>>
    : T[K] extends object
    ? SerializeDates<T[K]>
    : T[K];
};

/**
 * Promise型から内部の型を抽出
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * 関数の戻り値の型を抽出
 */
export type ReturnTypeOf<T extends (...args: any[]) => any> = ReturnType<T>;

/**
 * 非同期関数の戻り値の型を抽出
 */
export type AsyncReturnType<T extends (...args: any[]) => Promise<any>> = 
  T extends (...args: any[]) => Promise<infer U> ? U : any;

/**
 * 配列の要素の型を抽出
 */
export type ArrayElement<ArrayType extends readonly unknown[]> = 
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

/**
 * オブジェクトのキーを抽出してユニオン型にする
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * 値からキーを抽出する型
 */
export type ValueToKey<T> = T[keyof T];

/**
 * null と undefined を除外する型
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * 条件付きで型を変更する型
 */
export type ConditionalType<T, Condition, TrueType, FalseType> = 
  T extends Condition ? TrueType : FalseType;

// ========================================
// API レスポンス型
// ========================================

/**
 * 標準的なAPIレスポンス型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

/**
 * ページネーション付きAPIレスポンス型
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ========================================
// フォーム関連型
// ========================================

/**
 * フォームフィールドの状態
 */
export interface FieldState {
  value: any;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

/**
 * フォームの状態
 */
export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  dirty: boolean;
  submitting: boolean;
  valid: boolean;
}

/**
 * フォームハンドラー関数の型
 */
export type FormHandler<T> = (values: T) => Promise<void> | void;

/**
 * フィールドバリデーター関数の型
 */
export type FieldValidator<T> = (value: T) => string | undefined;

// ========================================
// イベント関連型
// ========================================

/**
 * イベントハンドラー関数の型
 */
export type EventHandler<T = Event> = (event: T) => void;

/**
 * 非同期イベントハンドラー関数の型
 */
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

/**
 * カスタムイベントの型
 */
export type CustomEventHandler<T = any> = (event: CustomEvent<T>) => void;

// ========================================
// ストレージ関連型
// ========================================

/**
 * ストレージキーの型
 */
export type StorageKey = string;

/**
 * ストレージ値の型
 */
export type StorageValue = string | number | boolean | object | null;

/**
 * ストレージオプションの型
 */
export interface StorageOptions {
  encrypt?: boolean;
  compress?: boolean;
  ttl?: number; // Time to live in milliseconds
}

// ========================================
// テスト関連型
// ========================================

/**
 * モックデータの型
 */
export type MockData<T> = DeepPartial<T> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * テストユーティリティ関数の型
 */
export type TestHelper<T> = {
  create: (overrides?: DeepPartial<T>) => T;
  createMany: (count: number, overrides?: DeepPartial<T>) => T[];
  update: (entity: T, updates: DeepPartial<T>) => T;
};