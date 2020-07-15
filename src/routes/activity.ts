import express from 'express';
import asyncHandler from 'express-async-handler';
import sanitizeQuery from '../middleware/sanitize-query';
import * as ActivityService from '../services/activity';
import useCollection from '../middleware/use-collection';

const router = express.Router();

router.get(
	'/',
	useCollection('directus_activity'),
	sanitizeQuery,
	asyncHandler(async (req, res) => {
		const records = await ActivityService.readActivities(req.sanitizedQuery, {
			role: req.role,
			admin: req.admin,
		});

		return res.json({
			data: records || null,
		});
	})
);

router.get(
	'/:pk',
	useCollection('directus_activity'),
	sanitizeQuery,
	asyncHandler(async (req, res) => {
		const record = await ActivityService.readActivity(req.params.pk, req.sanitizedQuery, {
			role: req.role,
			admin: req.admin,
		});

		return res.json({
			data: record || null,
		});
	})
);

router.post(
	'/comment',
	useCollection('directus_activity'),
	sanitizeQuery,
	asyncHandler(async (req, res) => {
		const primaryKey = await ActivityService.createActivity({
			...req.body,
			action: ActivityService.Action.COMMENT,
			action_by: req.user,
			ip: req.ip,
			user_agent: req.get('user-agent'),
		});

		const record = await ActivityService.readActivity(primaryKey, req.sanitizedQuery, {
			role: req.role,
			admin: req.admin,
		});

		return res.json({
			data: record || null,
		});
	})
);

router.patch(
	'/comment/:pk',
	useCollection('directus_activity'),
	sanitizeQuery,
	asyncHandler(async (req, res) => {
		const primaryKey = await ActivityService.updateActivity(req.params.pk, req.body, {
			role: req.role,
			admin: req.admin,
			user: req.user,
			ip: req.ip,
			userAgent: req.get('user-agent'),
		});

		const record = await ActivityService.readActivity(primaryKey, req.sanitizedQuery, {
			role: req.role,
			admin: req.admin,
		});

		return res.json({
			data: record || null,
		});
	})
);

router.delete(
	'/comment/:pk',
	useCollection('directus_activity'),
	asyncHandler(async (req, res) => {
		await ActivityService.deleteActivity(req.params.pk, {
			role: req.role,
			admin: req.admin,
			user: req.user,
			ip: req.ip,
			userAgent: req.get('user-agent'),
		});

		return res.status(200).end();
	})
);

export default router;
