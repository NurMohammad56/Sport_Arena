import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema(
  {
    fieldName: {
      type: String,
      required: [true, "Field name is required"],
      trim: true,
      maxlength: [100, "Field name cannot exceed 100 characters"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    fieldType: {
      type: String,
      required: [true, "Field type is required"],
      enum: {
        values: ["5v5", "6v6", "11v11"],
        message: "Field type must be 5v5, 6v6, or 11v11",
      },
    },

    pricePerHour: {
      type: Number,
      required: [true, "Price per hour is required"],
      min: [0, "Price cannot be negative"],
      max: [1000, "Price cannot exceed $1000"],
    },

    location: {
      address: {
        type: String,
        required: [true, "Address is required"],
        trim: true,
      },
      coordinates: {
        latitude: {
          type: Number,
          default: null,
        },
        longitude: {
          type: Number,
          default: null,
        },
      },
      mapUrl: {
        type: String,
        default: null,
      },
    },

    servicesAmenities: {
      showers: { type: Boolean, default: false },
      lights: { type: Boolean, default: false },
      parking: { type: Boolean, default: false },
      changingRooms: { type: Boolean, default: false },
      cafe: { type: Boolean, default: false },
      equipmentRental: { type: Boolean, default: false },
    },

    images: [
      {
        url: {
          type: String,
          required: true,
        },
        filename: String,
        originalName: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for geospatial queries
fieldSchema.index({ "location.coordinates": "2dsphere" });

// Index for search functionality
fieldSchema.index({
  fieldName: "text",
  description: "text",
  "location.address": "text",
});

// Virtual for minimum image requirement
fieldSchema.virtual("hasMinimumImages").get(function () {
  return this.images.length > 0;
});

// Pre-save middleware to validate minimum image requirement
fieldSchema.pre("save", function (next) {
  if (this.isNew && this.images.length === 0) {
    return next(new Error("At least one image is required"));
  }
  next();
});

// Method to get display address
fieldSchema.methods.getDisplayAddress = function () {
  return this.location.address;
};

// Method to check if field has specific amenity
fieldSchema.methods.hasAmenity = function (amenity) {
  return this.servicesAmenities[amenity] === true;
};

// Static method to find fields by type
fieldSchema.statics.findByType = function (fieldType) {
  return this.find({ fieldType, isActive: true });
};

// Static method to find fields within radius
fieldSchema.statics.findNearby = function (
  latitude,
  longitude,
  radiusInKm = 10
) {
  return this.find({
    "location.coordinates": {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: radiusInKm * 1000,
      },
    },
    isActive: true,
  });
};

export const Field = mongoose.model("Field", fieldSchema);
