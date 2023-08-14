const { getVeracodeApplicationScanStatus } = require('../src/services/application-service.js');

const vid = 'b30554e14ec41b2be3f7981839a9ad6d';
const vkey = 'd5b916a66a3d8a3474762fd84b21ff40f11608d8a9f7f8e5716a31ed007a2e1ca79a6b51e4cc6985cd2bc4bf248297b3716c787bdd6740d720501734e807089a'
const veracodeApp = {
  appGuid: '7bbd15ff-aeae-4136-91f8-55b41d604590'
}
const buildId = '28245266'

getVeracodeApplicationScanStatus(vid, vkey, veracodeApp, buildId);