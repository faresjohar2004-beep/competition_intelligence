import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import actionsRouter from "./actions";
import futureSelfRouter from "./futureSelf";
import chaptersRouter from "./chapters";
import lifeMapRouter from "./lifeMap";
import lettersRouter from "./letters";
import biographyRouter from "./biography";
import coachingRouter from "./coaching";
import timelineRouter from "./timeline";
import sharingRouter from "./sharing";
import adminRouter from "./admin";
import missionsRouter from "./missions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/actions", actionsRouter);
router.use("/future-self", futureSelfRouter);
router.use("/chapters", chaptersRouter);
router.use("/life-map", lifeMapRouter);
router.use("/letters", lettersRouter);
router.use("/biography", biographyRouter);
router.use("/coaching", coachingRouter);
router.use("/timeline", timelineRouter);
router.use("/sharing", sharingRouter);
router.use("/admin", adminRouter);
router.use("/missions", missionsRouter);

export default router;
