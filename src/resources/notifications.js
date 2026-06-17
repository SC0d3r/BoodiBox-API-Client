function createNotificationsResource({ config, request }) {
  async function getNotifications({ maxResults, cursor, date } = {}) {
    return request(`${config.apiPath}/notifications`, { query: { limit: maxResults, cursor, date } });
  }

  return { getNotifications };
}

module.exports = { createNotificationsResource };
