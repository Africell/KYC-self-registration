import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import ReactCrop, {
  type Crop,
  type PixelCrop,
} from "react-image-crop";

import "react-image-crop/dist/ReactCrop.css";

import { getCroppedImg } from "../../utils/cropImage";

interface Props {
  imageSrc?: string;
  onConfirm?: (img: string) => void;
  onCancel?: () => void;
}

export default function UploadExample({ imageSrc, onConfirm, onCancel }: Props = {}) {
  const [imgSrc, setImgSrc] = useState(imageSrc ?? "");
  const [rotation, setRotation] = useState(0);
  const [isRotating, setIsRotating] = useState(false);

  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    x: 25,
    y: 25,
    width: 50,
    height: 50,
  });

  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imgDisplaySize, setImgDisplaySize] = useState({ w: 0, h: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const imageWrapperRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const startAngleRef = useRef(0);
  const startRotationRef = useRef(0);
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    if (imageSrc) {
      setImgSrc(imageSrc);
      setRotation(0);
      setPanOffset({ x: 0, y: 0 });
      setCompletedCrop(undefined);
      setImgDisplaySize({ w: 0, h: 0 });
    }
  }, [imageSrc]);

  function onSelectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImgSrc(reader.result?.toString() || "");
      setRotation(0);
      setPanOffset({ x: 0, y: 0 });
      setCompletedCrop(undefined);
      setImgDisplaySize({ w: 0, h: 0 });
    });
    reader.readAsDataURL(file);
  }

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    setImgDisplaySize({ w: img.offsetWidth, h: img.offsetHeight });
  }

  function getAngleFromCenter(clientX: number, clientY: number): number {
    if (!imageWrapperRef.current) return 0;
    const rect = imageWrapperRef.current.getBoundingClientRect();
    return (
      Math.atan2(
        clientY - (rect.top + rect.height / 2),
        clientX - (rect.left + rect.width / 2),
      ) *
      (180 / Math.PI)
    );
  }

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (isRotating) {
      const delta = getAngleFromCenter(event.clientX, event.clientY) - startAngleRef.current;
      setRotation(startRotationRef.current + delta);
    }
    if (isPanning) {
      setPanOffset({
        x: panStartRef.current.offsetX + (event.clientX - panStartRef.current.mouseX),
        y: panStartRef.current.offsetY + (event.clientY - panStartRef.current.mouseY),
      });
    }
  }

  const rotationPadding = imgDisplaySize.w
    ? Math.ceil(
        (Math.sqrt(imgDisplaySize.w ** 2 + imgDisplaySize.h ** 2) -
          Math.max(imgDisplaySize.w, imgDisplaySize.h)) /
          2,
      )
    : 0;

  const rotateHandle = (
    <div
      onMouseDown={(e) => {
        e.stopPropagation();
        startAngleRef.current = getAngleFromCenter(e.clientX, e.clientY);
        startRotationRef.current = rotation;
        setIsRotating(true);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        startAngleRef.current = getAngleFromCenter(e.clientX, e.clientY);
        startRotationRef.current = rotation;
        setIsRotating(true);
      }}
      title="Drag to rotate"
      className={`absolute -top-4 left-1/2 -translate-x-1/2 z-150 flex h-8 w-8 select-none items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-lg transition-transform hover:bg-blue-700 ${isRotating ? "cursor-grabbing scale-110" : "cursor-grab"}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      {!imageSrc && (
        <input
          type="file"
          accept="image/*"
          onChange={onSelectFile}
        />
      )}

      {!!imgSrc && (
        <>
          <div
            className="relative overflow-hidden max-h-[70vh] rounded-xl border border-slate-700 bg-slate-800 p-4"
            onMouseMove={handleMouseMove}
            onMouseUp={() => { setIsRotating(false); setIsPanning(false); }}
            onMouseLeave={() => { setIsRotating(false); setIsPanning(false); }}
          >
            {isPanMode && (
              <div
                className={`absolute inset-0 z-200 select-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
                onMouseDown={(e) => {
                  panStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, offsetX: panOffset.x, offsetY: panOffset.y };
                  setIsPanning(true);
                }}
              />
            )}

            <style>{`
              .ReactCrop__drag-handle.ord-n { display: none !important; }
              .ReactCrop { overflow: visible !important; }
            `}</style>

            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              renderSelectionAddon={() => rotateHandle}
            >
              <div
                ref={imageWrapperRef}
                className="flex items-center justify-center"
                style={{
                  padding: rotationPadding,
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                }}
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Upload"
                  draggable={false}
                  onLoad={handleImageLoad}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: "center",
                    maxHeight: "500px",
                  }}
                  className="select-none object-contain"
                />
              </div>
            </ReactCrop>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsPanMode((v) => !v)}
              className={`rounded-xl px-5 py-2 text-sm font-medium border ${isPanMode ? "bg-blue-600 border-blue-500 text-white" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}
            >
              {isPanMode ? "Crop Mode" : "Move Image"}
            </button>

            <button
              onClick={() => setRotation(0)}
              className="rounded-xl border border-slate-700 px-5 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Reset Rotation
            </button>

            {onConfirm && (
              <button
                onClick={async () => {
                  if (imgRef.current && completedCrop) {
                    try {
                      const adjustedCrop = {
                        ...completedCrop,
                        x: completedCrop.x - panOffset.x,
                        y: completedCrop.y - panOffset.y,
                      };
                      const cropped = await getCroppedImg(imgRef.current, adjustedCrop, rotation);
                      onConfirm(cropped);
                    } catch (error) {
                      console.error(error);
                      onConfirm(imgSrc);
                    }
                  } else {
                    onConfirm(imgSrc);
                  }
                }}
                className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Confirm
              </button>
            )}

            {onCancel && (
              <button
                onClick={onCancel}
                className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-5 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/20"
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}


    </div>
  );
}

//idNumber and NN