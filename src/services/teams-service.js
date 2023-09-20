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
  core.debug(`Module: teams-service, function: getVeracodeTeamsByName. teams: ${teams}`);
  if (teams !== '') {
    const teamsName = teams.trim().split(',');
    let teamGuids = [];
    for (let index = 0; index < teamsName.length; index++) {
      const teamName = teamsName[index].trim();
      const responseData = await getTeamsByName(vid, vkey, teamName);
      if (responseData.page.total_elements !== 0) {
        for(let i = 0; i < responseData._embedded.teams.length; i++) {
          if (responseData._embedded.teams[i].team_name.toLowerCase()
                === teamName.toLowerCase()) {
            teamGuids.push({
              "guid": responseData._embedded.teams[i].team_id
            })
          }
        }
      }
    }
    return teamGuids;
  }
  return [];
}

module.exports = {
  getVeracodeTeamsByName,
};