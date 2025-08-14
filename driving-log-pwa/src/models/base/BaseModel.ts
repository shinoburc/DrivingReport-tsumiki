import { AppError, ErrorCode } from '../../types';

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * 全てのモデルクラスの基底クラス
 */
export abstract class BaseModel {
  /**
   * バリデーション実行
   */
  abstract validate(): ValidationResult;

  /**
   * JSON形式への変換
   */
  abstract toJSON(): Record<string, any>;

  /**
   * 不変オブジェクトとして作成
   */
  protected freeze(): this {
    return Object.freeze(this);
  }

  /**
   * オブジェクトのディープフリーズ
   */
  protected deepFreeze<T>(obj: T): T {
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      const value = (obj as any)[prop];
      if (value && typeof value === 'object') {
        this.deepFreeze(value);
      }
    });
    return Object.freeze(obj);
  }

  /**
   * 更新時刻を保証するヘルパー
   */
  protected createUpdatedTimestamp(): Date {
    return new Date(Date.now() + 1);
  }

  /**
   * プロパティの条件付き更新ヘルパー
   */
  protected updateProperty<T>(newValue: T | undefined, currentValue: T): T {
    return newValue !== undefined ? newValue : currentValue;
  }

  /**
   * JSONからインスタンス作成（各サブクラスで実装）
   */
  static fromJSON(data: Record<string, any>): BaseModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'fromJSON must be implemented by subclass');
  }
}