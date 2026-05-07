import { useState } from "react";
import { Navigation, ExternalLink, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MapSheet from "@/components/map/MapSheet";
import { buildMapsUrl, isIOS } from "@/lib/externalMaps";

interface Props {
  establishment: {
    name: string;
    latitude: number | null;
    longitude: number | null;
    distance_km?: number | null;
  };
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "default";
  fullWidth?: boolean;
  label?: string;
}

export function HowToGetThereButton({
  establishment,
  variant = "outline",
  size = "default",
  fullWidth = true,
  label = "Como chegar",
}: Props) {
  const [open, setOpen] = useState(false);

  const lat = establishment.latitude;
  const lng = establishment.longitude;
  const disabled = lat == null || lng == null;

  const ios = isIOS();

  return (
    <>
      <DropdownMenu>
        <div className="flex gap-2 w-full">
          <Button
            variant={variant === "primary" ? "default" : variant}
            size={size}
            className={fullWidth ? "flex-1 rounded-full gap-2" : "rounded-full gap-2"}
            disabled={disabled}
            onClick={() => setOpen(true)}
          >
            <Navigation className="w-4 h-4" />
            {label}
          </Button>
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant === "primary" ? "default" : variant}
              size={size}
              className="rounded-full px-3"
              disabled={disabled}
              aria-label="Abrir em outro app"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
        </div>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <MapIcon className="w-4 h-4 mr-2" />
            Navegação no app
          </DropdownMenuItem>
          {ios && (
            <DropdownMenuItem
              onClick={() => window.open(buildMapsUrl("apple", { lat: lat!, lng: lng!, name: establishment.name }), "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Apple Maps
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => window.open(buildMapsUrl("google", { lat: lat!, lng: lng!, name: establishment.name }), "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Google Maps
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => window.open(buildMapsUrl("waze", { lat: lat!, lng: lng!, name: establishment.name }), "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Waze
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {!disabled && (
        <MapSheet
          open={open}
          onClose={() => setOpen(false)}
          establishment={establishment}
        />
      )}
    </>
  );
}
