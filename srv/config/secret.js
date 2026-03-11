function loadSecrets() {
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

  if (!accessTokenSecret || !refreshTokenSecret) {
    throw new Error(
      'ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be set in environment variables'
    );
  }

  return { accessTokenSecret, refreshTokenSecret };
}

module.exports = loadSecrets;
