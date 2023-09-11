const appConfig = require('../app-cofig.js');
const { 
  getResourceByAttribute,
}= require('../api/http-requests.js');

async function getTeamsByName (vid, vkey, teamName)  {
  const resource = {
    resourceUri: appConfig().teamsUri,
    queryAttribute: 'team_name',
    queryValue: encodeURIComponent(teamName)
  };
  const response = await getResourceByAttribute(vid, vkey, resource);
  return response;
}

async function getVeracodeTeamsByName(vid, vkey, teams) {
  if (teams !== '') {
    const teamsName = teams.trim().split(',');
    let teamGuids = [];
    teamsName.forEach(async teamName => {
      const responseData = await getTeamsByName(vid, vkey, teamName);
      if (responseData.page.total_elements !== 0) {
        for(let i = 0; i < responseData._embedded.teams.length; i++) {
          if (responseData._embedded.teams[i].team_name.toLowerCase()
                === teamName.toLowerCase()) {
            teamGuids.push(responseData._embedded.teams[i].team_id);
          }
        }
      }
    });
    return teamGuids;
  }
  return [];
}

module.exports = {
  getVeracodeTeamsByName,
};