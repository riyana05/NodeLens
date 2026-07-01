const router = require('express').Router();
const g      = require('../controllers/graphController');
const { protect } = require('../middleware/jwtAuth');

router.use(protect);   // all analytics require auth

router.get('/summary',          g.getGraphSummary);
router.get('/pagerank',         g.getPageRank);
router.get('/backbone',         g.getBackbone);
router.get('/trust-path',       g.getTrustPath);
router.get('/recommend',        g.getRecommendations);
router.get('/communities',      g.getCommunities);
router.get('/echo-chambers',    g.getEchoChambers);
router.get('/stability',        g.getStability);
router.get('/conflicts',        g.getConflicts);
router.get('/simulate-spread',  g.simulateSpread);
router.get('/simulate-removal', g.simulateRemoval);
router.get('/friendship-risk',  g.getFriendshipRisk);
router.get('/full',             g.getFullAnalytics);

module.exports = router;
