import AppError from "../errors/AppError.js";
import { Team } from "../model/team.model.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";

export const createTeam = catchAsync(async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user._id;

  if (!name) throw new AppError(400, "Team name is required");

  const team = await Team.create({ name, description, createdBy: userId, members: [userId] });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Team created successfully",
    data: team,
  });
});

export const getMyTeams = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const teams = await Team.find({ members: userId }).populate("members", "name email");

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My teams retrieved",
    data: teams,
  });
});

export const joinTeam = catchAsync(async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user._id;

  const team = await Team.findById(teamId);
  if (!team) throw new AppError(404, "Team not found");

  if (team.members.includes(userId)) {
    throw new AppError(400, "Already a member of this team");
  }

  team.members.push(userId);
  await team.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Joined team successfully",
    data: team,
  });
});
