import express from 'express';
import {
  getProjects, getProject, createProject, updateProject, deleteProject,
  addTask, updateTask, deleteTask,
} from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.route('/').get(getProjects).post(createProject);
router.route('/:id').get(getProject).put(updateProject).delete(deleteProject);
router.post('/:id/tasks', addTask);
router.put('/:id/tasks/:taskId', updateTask);
router.delete('/:id/tasks/:taskId', deleteTask);

export default router;
