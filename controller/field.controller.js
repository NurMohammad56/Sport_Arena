import AppError from "../errors/AppError.js";
import { Field } from "../model/field.model.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import { uploadOnCloudinary } from "../utils/commonMethod.js";

// Create new field
export const createField = catchAsync(async (req, res) => {
  const {
    fieldName,
    description,
    fieldType,
    pricePerHour,
    address,
    servicesAmenities,
  } = req.body;
  const ownerId = req.user._id;

  const images = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const result = await uploadOnCloudinary(file.buffer);
      images.push({
        url: result.secure_url,
        public_id: result.public_id,
        originalName: file.originalname,
        uploadDate: new Date(),
      });
    }
  }

  // Validate minimum image requirement
  if (images.length === 0) {
    throw new AppError(400, "At least one image is required");
  }

  const field = await Field.create({
    fieldName,
    description,
    fieldType,
    pricePerHour: parseFloat(pricePerHour),
    location: {
      address,
      coordinates: null,
    },
    servicesAmenities: servicesAmenities ? JSON.parse(servicesAmenities) : {},
    images,
    owner: ownerId,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Field created successfully",
    data: field,
  });
});

// Get all fields with filtering and pagination
export const getAllFields = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    fieldType,
    minPrice,
    maxPrice,
    amenities,
  } = req.query;

  const filter = { isActive: true };

  // Apply filters
  if (fieldType) filter.fieldType = fieldType;
  if (minPrice || maxPrice) {
    filter.pricePerHour = {};
    if (minPrice) filter.pricePerHour.$gte = parseFloat(minPrice);
    if (maxPrice) filter.pricePerHour.$lte = parseFloat(maxPrice);
  }
  if (amenities) {
    const amenityList = amenities.split(",");
    amenityList.forEach((amenity) => {
      filter[`servicesAmenities.${amenity}`] = true;
    });
  }

  const fields = await Field.find(filter)
    .populate("owner", "name email")
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Field.countDocuments(filter);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Fields retrieved successfully",
    data: {
      fields,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalFields: total,
    },
  });
});

// Get single field by ID
export const getFieldById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const field = await Field.findById(id).populate("owner", "name email phone");
  if (!field) {
    throw new AppError(404, "Field not found");
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Field retrieved successfully",
    data: field,
  });
});

// Update field
export const updateField = catchAsync(async (req, res) => {
  const { id } = req.params;
  const {
    fieldName,
    description,
    fieldType,
    pricePerHour,
    address,
    servicesAmenities,
  } = req.body;
  const ownerId = req.user._id;

  // Find field and verify ownership
  const field = await Field.findOne({ _id: id, owner: ownerId });
  if (!field) {
    throw new AppError(404, "Field not found or you don't have permission");
  }

  // Handle new image uploads
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const result = await uploadOnCloudinary(file.buffer);
      field.images.push({
        url: result.secure_url,
        public_id: result.public_id,
        originalName: file.originalname,
        uploadDate: new Date(),
      });
    }
  }

  // Update fields if provided
  if (fieldName) field.fieldName = fieldName;
  if (description) field.description = description;
  if (fieldType) field.fieldType = fieldType;
  if (pricePerHour) field.pricePerHour = parseFloat(pricePerHour);
  if (address) field.location.address = address;
  if (servicesAmenities) {
    field.servicesAmenities = {
      ...field.servicesAmenities,
      ...JSON.parse(servicesAmenities),
    };
  }

  await field.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Field updated successfully",
    data: field,
  });
});

// Delete field (soft delete)
export const deleteField = catchAsync(async (req, res) => {
  const { id } = req.params;
  const ownerId = req.user._id;

  const field = await Field.findOneAndUpdate(
    { _id: id, owner: ownerId },
    { isActive: false },
    { new: true }
  );

  if (!field) {
    throw new AppError(404, "Field not found or you don't have permission");
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Field deleted successfully",
    data: null,
  });
});

// Search fields
export const searchFields = catchAsync(async (req, res) => {
  const { query, fieldType, location, radius = 10 } = req.query;

  const searchFilter = { isActive: true };

  if (query) {
    searchFilter.$text = { $search: query };
  }

  if (fieldType) {
    searchFilter.fieldType = fieldType;
  }

  // Location-based search
  if (location) {
    const [lat, lng] = location
      .split(",")
      .map((coord) => parseFloat(coord.trim()));
    if (!isNaN(lat) && !isNaN(lng)) {
      searchFilter["location.coordinates"] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: radius * 1000,
        },
      };
    }
  }

  const fields = await Field.find(searchFilter)
    .populate("owner", "name email")
    .sort({ rating: -1, createdAt: -1 });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Fields search completed successfully",
    data: fields,
  });
});

// Get fields by owner
export const getFieldsByOwner = catchAsync(async (req, res) => {
  const ownerId = req.user._id;
  const { page = 1, limit = 10 } = req.query;

  const fields = await Field.find({ owner: ownerId })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Field.countDocuments({ owner: ownerId });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Owner fields retrieved successfully",
    data: {
      fields,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalFields: total,
    },
  });
});

// Remove specific image from field
export const removeFieldImage = catchAsync(async (req, res) => {
  const { id, imageId } = req.params;
  const ownerId = req.user._id;

  const field = await Field.findOne({ _id: id, owner: ownerId });
  if (!field) {
    throw new AppError(404, "Field not found or you don't have permission");
  }

  field.images = field.images.filter((img) => img._id.toString() !== imageId);

  if (field.images.length === 0) {
    throw new AppError(400, "Field must have at least one image");
  }

  await field.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Image removed successfully",
    data: field,
  });
});
