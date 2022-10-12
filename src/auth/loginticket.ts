export interface TokenPayload {
  /**
   * An identifier for the user, unique among all Dare accounts and never
   * reused. A Dare account can have multiple emails at different points in
   * time, but the sub value is never changed. Use sub within your application
   * as the unique-identifier key for the user.
   */
  sub: string;

  /**
   * Identifies the audience that this ID token is intended for. It must be one
   * of the OAuth 2.0 client IDs of your application.
   */
  aud: string;

  /**
   * The time the ID token expires, represented in Unix time (integer seconds).
   */
  exp: number;
}
