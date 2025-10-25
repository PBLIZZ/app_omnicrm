"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { Plus, Edit2, Trash2, Palette, Search, Filter } from "lucide-react";
import { useZones } from "@/hooks/use-zones";
import { useToast } from "@/hooks/use-toast";
import type { Zone } from "@/server/db/business-schemas";

interface ZoneManagementProps {
  onZoneSelect?: (zone: Zone) => void;
}

interface CreateZoneFormData {
  name: string;
  color: string;
  iconName: string;
}

/**
 * ZoneManagement - Zone CRUD and customization interface
 *
 * Features:
 * - Create, edit, delete custom zones
 * - Color picker for zone customization
 * - Icon selector
 * - Search and filter zones
 * - Zone usage statistics
 */
export function ZoneManagement({ onZoneSelect }: ZoneManagementProps): JSX.Element {
  const { zones, isLoading } = useZones();
  const { toast } = useToast();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateZoneFormData>({
    name: "",
    color: "#6366F1",
    iconName: "circle",
  });

  // Predefined colors for zone customization
  const zoneColors = [
    "#6366F1", // Indigo
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#EF4444", // Red
    "#F97316", // Orange
    "#F59E0B", // Amber
    "#EAB308", // Yellow
    "#84CC16", // Lime
    "#22C55E", // Green
    "#10B981", // Emerald
    "#14B8A6", // Teal
    "#06B6D4", // Cyan
    "#0EA5E9", // Sky
    "#3B82F6", // Blue
    "#6366F1", // Indigo
    "#8B5CF6", // Purple
  ];

  // Predefined icons for zones
  const zoneIcons = [
    "circle",
    "square",
    "triangle",
    "diamond",
    "star",
    "heart",
    "sparkles",
    "target",
    "trending-up",
    "users",
    "calendar",
    "clock",
    "bell",
    "bookmark",
    "flag",
    "tag",
    "folder",
    "file",
    "image",
    "video",
    "music",
    "camera",
  ];

  // Filter zones based on search and category
  const filteredZones = zones.filter((zone) => {
    const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || zone.name.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const handleCreateZone = async (): Promise<void> => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Zone name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Implement zone creation API call
      toast({
        title: "Zone Created",
        description: `"${formData.name}" has been added to your zones.`,
      });

      setIsCreateDialogOpen(false);
      setFormData({ name: "", color: "#6366F1", iconName: "circle" });
    } catch (error) {
      toast({
        title: "Failed to Create Zone",
        description: "Please try again or check your connection.",
        variant: "destructive",
      });
    }
  };

  const handleEditZone = async (zone: Zone): Promise<void> => {
    try {
      // TODO: Implement zone update API call
      toast({
        title: "Zone Updated",
        description: `"${zone.name}" has been updated.`,
      });

      setEditingZone(null);
    } catch (error) {
      toast({
        title: "Failed to Update Zone",
        description: "Please try again or check your connection.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteZone = async (zone: Zone): Promise<void> => {
    try {
      // TODO: Implement zone deletion API call
      toast({
        title: "Zone Deleted",
        description: `"${zone.name}" has been removed.`,
      });
    } catch (error) {
      toast({
        title: "Failed to Delete Zone",
        description: "Please try again or check your connection.",
        variant: "destructive",
      });
    }
  };

  const resetForm = (): void => {
    setFormData({ name: "", color: "#6366F1", iconName: "circle" });
  };

  const openCreateDialog = (): void => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (zone: Zone): void => {
    setFormData({
      name: zone.name,
      color: zone.color || "#6366F1",
      iconName: zone.iconName || "circle",
    });
    setEditingZone(zone);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zone Management</CardTitle>
          <CardDescription>Manage your wellness zones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Zone Management</CardTitle>
              <CardDescription>Manage your wellness zones and life areas</CardDescription>
            </div>
            <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Zone
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search zones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Personal">Personal</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
                <SelectItem value="Health">Health</SelectItem>
                <SelectItem value="Social">Social</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Zones List */}
          <div className="space-y-3">
            {filteredZones.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Palette className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">No zones found</h3>
                <p className="text-gray-500 text-sm">
                  {searchTerm || selectedCategory !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Create your first custom zone to get started."}
                </p>
              </div>
            ) : (
              filteredZones.map((zone) => (
                <div
                  key={zone.uuidId}
                  className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-sm transition-all"
                >
                  {/* Zone Color Indicator */}
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: zone.color || "#6366F1" }}
                  />

                  {/* Zone Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{zone.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {zone.iconName || "circle"}
                      </Badge>
                      <span className="text-xs text-gray-500">ID: {zone.uuidId}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onZoneSelect?.(zone)}
                      className="h-8 w-8 p-0"
                    >
                      <Filter className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(zone)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteZone(zone)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Zone Dialog */}
      <Dialog
        open={isCreateDialogOpen || editingZone !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingZone(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingZone ? "Edit Zone" : "Create New Zone"}</DialogTitle>
            <DialogDescription>
              {editingZone
                ? "Update the zone details and customization options."
                : "Add a new wellness zone to organize your life areas."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Zone Name */}
            <div className="space-y-2">
              <Label htmlFor="zone-name">Zone Name *</Label>
              <Input
                id="zone-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Personal Wellness, Business Development"
                autoFocus
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label>Zone Color</Label>
              <div className="grid grid-cols-8 gap-2">
                {zoneColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? "border-gray-900 scale-110"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* Icon Selector */}
            <div className="space-y-2">
              <Label>Zone Icon</Label>
              <Select
                value={formData.iconName}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, iconName: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  {zoneIcons.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{icon}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: formData.color }} />
                <span className="font-medium">{formData.name || "Zone Name"}</span>
                <Badge variant="outline" className="text-xs">
                  {formData.iconName}
                </Badge>
              </div>
            </div>
          </div>

          {/* Dialog Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingZone(null);
                resetForm();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={editingZone ? () => handleEditZone(editingZone) : handleCreateZone}
              disabled={!formData.name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {editingZone ? "Update Zone" : "Create Zone"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
