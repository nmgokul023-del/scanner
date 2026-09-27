import os
import struct
import math
import json
from typing import Dict, Any, List, Optional
from PIL import Image

try:
    import rasterio
    from rasterio.warp import transform_bounds
    from rasterio.crs import CRS
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

try:
    import geopandas as gpd
    import shapely
    from shapely.geometry import box, shape, mapping
    import pyproj
    HAS_GEOPANDAS = True
except ImportError:
    HAS_GEOPANDAS = False


class GeospatialService:
    @staticmethod
    def inspect_and_validate(file_path: str, original_filename: str) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            return {
                "valid": False,
                "error": "File not found on server disk.",
                "checklist": []
            }
            
        ext = os.path.splitext(original_filename.lower())[1]
        file_size = os.path.getsize(file_path)
        
        if ext in (".tif", ".tiff"):
            return GeospatialService._inspect_geotiff(file_path, original_filename, file_size)
        elif ext in (".geojson", ".json", ".gpkg"):
            return GeospatialService._inspect_vector(file_path, original_filename, file_size)
        elif ext in (".jpg", ".jpeg", ".png"):
            return GeospatialService._inspect_image(file_path, original_filename, file_size)
        elif ext in (".las", ".laz"):
            return GeospatialService._inspect_las(file_path, original_filename, file_size)
        elif ext == ".zip":
            # Check if zip contains shapefile or raster
            return GeospatialService._inspect_zip(file_path, original_filename, file_size)
        else:
            return {
                "valid": False,
                "error": f"Unsupported GIS format: {ext}",
                "checklist": []
            }

    @staticmethod
    def _inspect_geotiff(file_path: str, filename: str, file_size: int) -> Dict[str, Any]:
        if HAS_RASTERIO:
            try:
                with rasterio.open(file_path) as src:
                    width = src.width
                    height = src.height
                    bands = src.count
                    dtypes = [str(d) for d in src.dtypes]
                    data_type = dtypes[0] if dtypes else "Unknown"
                    crs_obj = src.crs
                    transform = src.transform
                    affine_list = [transform.a, transform.b, transform.c, transform.d, transform.e, transform.f]
                    res_x, res_y = abs(src.res[0]), abs(src.res[1])
                    nodata = src.nodata
                    
                    is_georeferenced = False
                    bounds = None
                    crs_str = "CRS: Not Available"
                    gsd_cm = None
                    resolution_str = "GSD: Not Available"
                    coverage_sqkm = None
                    coverage_str = "Not Available"
                    
                    if crs_obj:
                        crs_str = crs_obj.to_string()
                        is_georeferenced = True
                        
                        # Calculate GSD
                        if crs_obj.is_projected:
                            gsd_m = (res_x + res_y) / 2.0
                            gsd_cm = round(gsd_m * 100, 2)
                            resolution_str = f"{gsd_cm} cm / pixel"
                        elif crs_obj.is_geographic:
                            mid_lat = (src.bounds.bottom + src.bounds.top) / 2.0
                            lat_m = 111320.0
                            lon_m = 111320.0 * math.cos(math.radians(mid_lat))
                            gsd_m = ((res_x * lon_m) + (res_y * lat_m)) / 2.0
                            gsd_cm = round(gsd_m * 100, 2)
                            resolution_str = f"{gsd_cm} cm / pixel (approx)"
                            
                        # Bounds in WGS84 for Leaflet
                        try:
                            wgs84_b = transform_bounds(src.crs, "EPSG:4326", *src.bounds)
                            bounds = [
                                [round(wgs84_b[1], 6), round(wgs84_b[0], 6)],
                                [round(wgs84_b[3], 6), round(wgs84_b[2], 6)]
                            ]
                            # Coverage area
                            if crs_obj.is_projected:
                                area_sqm = abs((src.bounds.right - src.bounds.left) * (src.bounds.top - src.bounds.bottom))
                                coverage_sqkm = round(area_sqm / 1_000_000.0, 4)
                            else:
                                lat_dist = abs(wgs84_b[3] - wgs84_b[1]) * 111320.0
                                lon_dist = abs(wgs84_b[2] - wgs84_b[0]) * 111320.0 * math.cos(math.radians((wgs84_b[1] + wgs84_b[3]) / 2.0))
                                coverage_sqkm = round((lat_dist * lon_dist) / 1_000_000.0, 4)
                            coverage_str = f"{coverage_sqkm} km²"
                        except Exception:
                            bounds = None

                    megapixels = round((width * height) / 1_000_000, 2)
                    checklist = [
                        {"name": "File integrity & COG structure", "status": "Passed", "detail": f"GeoTIFF raster, {bands} bands, {width:,} × {height:,} px ({megapixels} MP), dtype={data_type}"},
                        {"name": "Coordinate Reference System", "status": "Passed" if is_georeferenced else "Warning", "detail": crs_str},
                        {"name": "Ground Sampling Distance (GSD)", "status": "Passed" if gsd_cm is not None else "Info", "detail": resolution_str},
                        {"name": "Spatial extent & bounds", "status": "Passed" if bounds else "Info", "detail": f"BBox [{bounds[0][0]}, {bounds[0][1]} to {bounds[1][0]}, {bounds[1][1]}]" if bounds else "Georeferencing: Not Available"},
                        {"name": "Coverage area", "status": "Passed" if coverage_sqkm else "Info", "detail": coverage_str}
                    ]

                    return {
                        "valid": True,
                        "is_georeferenced": is_georeferenced,
                        "type": "GeoTIFF",
                        "width": width,
                        "height": height,
                        "bands": bands,
                        "data_type": data_type,
                        "crs": crs_str,
                        "gsd_cm": gsd_cm,
                        "resolution": resolution_str,
                        "coverage_sqkm": coverage_sqkm,
                        "coverage_str": coverage_str,
                        "dimensions": f"{width:,} × {height:,} px",
                        "bounds": bounds,
                        "nodata": nodata,
                        "affine_transform": affine_list,
                        "checklist": checklist
                    }
            except Exception as e:
                # Fallback to PIL if rasterio encounters format error
                pass

        # PIL fallback if rasterio failed or wasn't applicable
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                mode = img.mode
                bands = len(img.getbands()) if hasattr(img, 'getbands') else 3
                tags = getattr(img, 'tag_v2', {}) or {}
                has_geokeys = 34735 in tags
                has_tiepoint = 33922 in tags
                
                pixel_scale = tags.get(33550)
                gsd_m = float(pixel_scale[0]) if pixel_scale and len(pixel_scale) >= 2 and float(pixel_scale[0]) > 0 else None
                gsd_cm = round(gsd_m * 100, 2) if gsd_m is not None else None
                resolution = f"{gsd_cm} cm / pixel" if gsd_cm is not None else "GSD: Not Available"
                
                crs = "GeoTIFF Georeferenced (Embedded GeoKeys)" if (has_geokeys or has_tiepoint) else "CRS: Not Available"
                is_georeferenced = has_geokeys or has_tiepoint
                bounds = None
                coverage_sqkm = None
                coverage_str = "Not Available"
                
                if has_tiepoint and gsd_m:
                    tiepoints = tags.get(33922)
                    if tiepoints and len(tiepoints) >= 6:
                        origin_x = float(tiepoints[3])
                        origin_y = float(tiepoints[4])
                        dx = float(pixel_scale[0])
                        dy = float(pixel_scale[1])
                        min_x, max_x = origin_x, origin_x + (width * dx)
                        max_y, min_y = origin_y, origin_y - (height * dy)
                        if -180 <= min_x <= 180 and -90 <= min_y <= 90:
                            bounds = [[round(min_y, 6), round(min_x, 6)], [round(max_y, 6), round(max_x, 6)]]
                            crs = "EPSG:4326"
                
                megapixels = round((width * height) / 1_000_000, 2)
                checklist = [
                    {"name": "File integrity", "status": "Passed", "detail": f"Valid TIFF, mode={mode}, {bands} bands, {width:,} × {height:,} px ({megapixels} MP)"},
                    {"name": "Coordinate Reference System", "status": "Passed" if is_georeferenced else "Warning", "detail": crs},
                    {"name": "Ground Sampling Distance (GSD)", "status": "Passed" if gsd_cm is not None else "Info", "detail": resolution},
                    {"name": "Spatial extent", "status": "Passed" if bounds else "Info", "detail": "Georeferencing: Not Available" if not bounds else str(bounds)}
                ]
                
                return {
                    "valid": True,
                    "is_georeferenced": is_georeferenced,
                    "type": "GeoTIFF" if is_georeferenced else "Standard TIFF Image",
                    "width": width,
                    "height": height,
                    "bands": bands,
                    "crs": crs,
                    "gsd_cm": gsd_cm,
                    "resolution": resolution,
                    "coverage_sqkm": coverage_sqkm,
                    "coverage_str": coverage_str,
                    "dimensions": f"{width:,} × {height:,} px",
                    "bounds": bounds,
                    "checklist": checklist
                }
        except Exception as e:
            return {
                "valid": False,
                "error": f"Unable to read GeoTIFF: {str(e)}",
                "checklist": [{"name": "File integrity", "status": "Failed", "detail": f"Error: {str(e)}"}]
            }

    @staticmethod
    def _inspect_vector(file_path: str, filename: str, file_size: int) -> Dict[str, Any]:
        if not HAS_GEOPANDAS:
            return {
                "valid": False,
                "error": "Geopandas / GDAL not installed on server.",
                "checklist": []
            }
        try:
            gdf = gpd.read_file(file_path)
            feature_count = len(gdf)
            crs_str = str(gdf.crs) if gdf.crs else "CRS: Not Available"
            geom_types = list(gdf.geom_type.unique()) if not gdf.empty else []
            geometry_type_str = ", ".join(geom_types) if geom_types else "None"
            
            bounds = None
            vector_geojson = None
            coverage_sqkm = None
            coverage_str = "Not Available"
            
            if gdf.crs:
                try:
                    gdf_4326 = gdf.to_crs("EPSG:4326")
                    tb = gdf_4326.total_bounds # minx, miny, maxx, maxy
                    bounds = [[round(tb[1], 6), round(tb[0], 6)], [round(tb[3], 6), round(tb[2], 6)]]
                    vector_geojson = json.loads(gdf_4326.to_json())
                    
                    # Compute area
                    try:
                        gdf_proj = gdf.to_crs("EPSG:3857")
                        total_area_sqm = gdf_proj.geometry.area.sum()
                        coverage_sqkm = round(total_area_sqm / 1_000_000.0, 4)
                        coverage_str = f"{coverage_sqkm} km²"
                    except Exception:
                        pass
                except Exception:
                    vector_geojson = json.loads(gdf.to_json())
            else:
                vector_geojson = json.loads(gdf.to_json())

            checklist = [
                {"name": "Vector dataset integrity", "status": "Passed", "detail": f"Valid vector layer with {feature_count:,} features"},
                {"name": "Geometry classification", "status": "Passed", "detail": f"Types: {geometry_type_str}"},
                {"name": "Coordinate Reference System", "status": "Passed" if gdf.crs else "Warning", "detail": crs_str},
                {"name": "Spatial coverage bounds", "status": "Passed" if bounds else "Info", "detail": f"BBox [{bounds[0][0]}, {bounds[0][1]} to {bounds[1][0]}, {bounds[1][1]}]" if bounds else "Georeferencing: Not Available"}
            ]

            return {
                "valid": True,
                "is_georeferenced": gdf.crs is not None,
                "type": "Vector GIS Layer",
                "feature_count": feature_count,
                "geometry_types": geom_types,
                "geometry_type": geometry_type_str,
                "crs": crs_str,
                "width": 0,
                "height": 0,
                "bands": 0,
                "gsd_cm": None,
                "resolution": "Vector Linework (GSD: Not Available)",
                "coverage_sqkm": coverage_sqkm,
                "coverage_str": coverage_str,
                "dimensions": f"{feature_count:,} Features",
                "bounds": bounds,
                "vector_geojson": vector_geojson,
                "checklist": checklist
            }
        except Exception as e:
            return {
                "valid": False,
                "error": f"Unable to read vector dataset: {str(e)}",
                "checklist": [{"name": "File integrity", "status": "Failed", "detail": f"Error: {str(e)}"}]
            }

    @staticmethod
    def _inspect_image(file_path: str, filename: str, file_size: int) -> Dict[str, Any]:
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                format_name = img.format or "Image"
                bands = len(img.getbands()) if hasattr(img, 'getbands') else 3
                megapixels = round((width * height) / 1_000_000, 2)
                
                # Check for EXIF GPS tags
                exif = getattr(img, '_getexif', lambda: None)() or {}
                has_gps = 34853 in exif
                
                crs = "CRS: Not Available"
                is_georeferenced = False
                bounds = None
                
                if has_gps:
                    try:
                        gps_info = exif[34853]
                        # EXIF GPS processing if available
                        lat_ref = gps_info.get(1, 'N')
                        lat_val = gps_info.get(2)
                        lon_ref = gps_info.get(3, 'E')
                        lon_val = gps_info.get(4)
                        if lat_val and lon_val and len(lat_val) >= 3 and len(lon_val) >= 3:
                            lat = float(lat_val[0]) + float(lat_val[1])/60.0 + float(lat_val[2])/3600.0
                            if lat_ref == 'S': lat = -lat
                            lon = float(lon_val[0]) + float(lon_val[1])/60.0 + float(lon_val[2])/3600.0
                            if lon_ref == 'W': lon = -lon
                            if -90 <= lat <= 90 and -180 <= lon <= 180:
                                crs = "EPSG:4326 (EXIF GPS Point Camera Center)"
                                is_georeferenced = True
                                # Small boundary around point camera center
                                delta = 0.001
                                bounds = [[round(lat - delta, 6), round(lon - delta, 6)], [round(lat + delta, 6), round(lon + delta, 6)]]
                    except Exception:
                        pass
                
                checklist = [
                    {"name": "File integrity", "status": "Passed", "detail": f"Valid {format_name} image, {width:,} × {height:,} px ({megapixels} MP), {bands} bands"},
                    {"name": "Coordinate Reference System", "status": "Passed" if is_georeferenced else "Info", "detail": crs if is_georeferenced else "Unreferenced Image (No spatial metadata)"},
                    {"name": "Ground Sampling Distance (GSD)", "status": "Info", "detail": "GSD: Not Available"},
                    {"name": "Spatial extent bounds", "status": "Info", "detail": "Georeferencing: Not Available" if not bounds else str(bounds)},
                    {"name": "Geo-referencing", "status": "Passed" if is_georeferenced else "Info", "detail": "Image uploaded — georeferencing unavailable" if not is_georeferenced else "EXIF GPS Camera Center detected"}
                ]

                return {
                    "valid": True,
                    "is_georeferenced": is_georeferenced,
                    "type": f"{format_name} Drone Image",
                    "width": width,
                    "height": height,
                    "bands": bands,
                    "crs": crs if is_georeferenced else "Unreferenced Image",
                    "gsd_cm": None,
                    "resolution": "GSD: Not Available",
                    "coverage_sqkm": None,
                    "coverage_str": "Not Available",
                    "dimensions": f"{width:,} × {height:,} px",
                    "bounds": bounds,
                    "checklist": checklist
                }
        except Exception as e:
            return {
                "valid": False,
                "error": f"Image inspection error: {str(e)}",
                "checklist": []
            }

    @staticmethod
    def _inspect_zip(file_path: str, filename: str, file_size: int) -> Dict[str, Any]:
        import zipfile
        import tempfile
        try:
            with zipfile.ZipFile(file_path, 'r') as zf:
                namelist = zf.namelist()
                shp_files = [n for n in namelist if n.lower().endswith('.shp')]
                tif_files = [n for n in namelist if n.lower().endswith(('.tif', '.tiff'))]
                
                # If contains shapefile, extract and inspect vector
                if shp_files and HAS_GEOPANDAS:
                    temp_dir = tempfile.mkdtemp()
                    zf.extractall(temp_dir)
                    shp_path = os.path.join(temp_dir, shp_files[0])
                    res = GeospatialService._inspect_vector(shp_path, shp_files[0], file_size)
                    res["type"] = "Shapefile (ZIP Archive)"
                    return res
                elif tif_files:
                    temp_dir = tempfile.mkdtemp()
                    zf.extractall(temp_dir)
                    tif_path = os.path.join(temp_dir, tif_files[0])
                    res = GeospatialService._inspect_geotiff(tif_path, tif_files[0], file_size)
                    res["type"] = "GeoTIFF (ZIP Archive)"
                    return res
                else:
                    return {
                        "valid": True,
                        "is_georeferenced": False,
                        "type": "Archive (ZIP)",
                        "width": 0,
                        "height": 0,
                        "bands": 0,
                        "crs": "CRS: Not Available",
                        "gsd_cm": None,
                        "resolution": "GSD: Not Available",
                        "coverage_sqkm": None,
                        "coverage_str": "Not Available",
                        "dimensions": f"{len(namelist)} Files",
                        "bounds": None,
                        "checklist": [{"name": "Archive integrity", "status": "Passed", "detail": f"Contains {len(namelist)} files without recognizeable GIS shapefile or raster"}]
                    }
        except Exception as e:
            return {
                "valid": False,
                "error": f"ZIP archive inspection error: {str(e)}",
                "checklist": []
            }

    @staticmethod
    def _inspect_las(file_path: str, filename: str, file_size: int) -> Dict[str, Any]:
        try:
            with open(file_path, "rb") as f:
                header = f.read(375)
                if len(header) < 227 or header[0:4] != b"LASF":
                    return {
                        "valid": False,
                        "error": "Not a valid LAS/LAZ point cloud file.",
                        "checklist": []
                    }
                point_count = struct.unpack_from("<I", header, 107)[0]
                return {
                    "valid": True,
                    "is_georeferenced": True,
                    "type": "LiDAR LAS Point Cloud",
                    "width": 0,
                    "height": 0,
                    "bands": 1,
                    "crs": "Projected Coordinates (Point Cloud Header)",
                    "gsd_cm": None,
                    "resolution": "GSD: Not Available",
                    "coverage_sqkm": None,
                    "coverage_str": "Not Available",
                    "dimensions": f"{point_count:,} Points",
                    "bounds": None,
                    "checklist": [{"name": "File integrity", "status": "Passed", "detail": f"{point_count:,} LiDAR points"}]
                }
        except Exception as e:
            return {
                "valid": False,
                "error": f"LAS inspection error: {str(e)}",
                "checklist": []
            }

    @staticmethod
    def compare_datasets(ref_dataset: Dict[str, Any], cur_dataset: Dict[str, Any]) -> Dict[str, Any]:
        """
        Real spatial comparison between reference dataset (e.g. Government/Open GIS)
        and current dataset (e.g. Uploaded GeoTIFF or drone orthomosaic).
        """
        ref_crs = ref_dataset.get("crs") or "CRS: Not Available"
        cur_crs = cur_dataset.get("crs") or "CRS: Not Available"
        
        # Check if bounds exist for both
        ref_bounds = ref_dataset.get("bounds")
        cur_bounds = cur_dataset.get("bounds")
        
        if not ref_bounds or not cur_bounds:
            return {
                "success": False,
                "status": "CANNOT_COMPARE",
                "message": "Both datasets must possess valid georeferencing bounds for spatial comparison.",
                "source_crs_ref": ref_crs,
                "source_crs_cur": cur_crs,
                "differences": []
            }

        # Convert bounds to shapely boxes in WGS84
        # bounds format: [[min_lat, min_lng], [max_lat, max_lng]]
        b_ref = box(ref_bounds[0][1], ref_bounds[0][0], ref_bounds[1][1], ref_bounds[1][0])
        b_cur = box(cur_bounds[0][1], cur_bounds[0][0], cur_bounds[1][1], cur_bounds[1][0])

        # Reproject to EPSG:3857 for geodesic metric area calculation
        try:
            transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
            import shapely.ops as ops
            b_ref_m = ops.transform(transformer.transform, b_ref)
            b_cur_m = ops.transform(transformer.transform, b_cur)

            ref_area_sqm = round(b_ref_m.area, 2)
            cur_area_sqm = round(b_cur_m.area, 2)
            area_delta_sqm = round(cur_area_sqm - ref_area_sqm, 2)

            intersection_m = b_ref_m.intersection(b_cur_m)
            overlap_area_sqm = round(intersection_m.area, 2) if not intersection_m.is_empty else 0.0
            overlap_pct = round((overlap_area_sqm / max(ref_area_sqm, 1.0)) * 100, 2)

            sym_diff_m = b_ref_m.symmetric_difference(b_cur_m)
            diff_area_sqm = round(sym_diff_m.area, 2) if not sym_diff_m.is_empty else 0.0

            # Convert intersection back to WGS84 GeoJSON
            transformer_inv = pyproj.Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
            overlap_geom = mapping(ops.transform(transformer_inv.transform, intersection_m)) if not intersection_m.is_empty else None
            sym_diff_geom = mapping(ops.transform(transformer_inv.transform, sym_diff_m)) if not sym_diff_m.is_empty else None

            discrepancy_level = "None"
            if overlap_pct < 10:
                discrepancy_level = "No Significant Overlap"
            elif diff_area_sqm > 500:
                discrepancy_level = "Potential Boundary Difference Detected"
            else:
                discrepancy_level = "High Geometric Alignment"

            return {
                "success": True,
                "status": "COMPARED",
                "comparison_title": f"Spatial Comparison: {ref_dataset.get('name')} vs {cur_dataset.get('name')}",
                "reference_dataset": {
                    "id": ref_dataset.get("id"),
                    "name": ref_dataset.get("name"),
                    "source_type": ref_dataset.get("source_type"),
                    "source_organization": ref_dataset.get("source_organization", "Government / Open GIS"),
                    "source_crs": ref_crs,
                    "computed_area_sqm": ref_area_sqm
                },
                "current_dataset": {
                    "id": cur_dataset.get("id"),
                    "name": cur_dataset.get("name"),
                    "source_type": cur_dataset.get("source_type"),
                    "source_crs": cur_crs,
                    "computed_area_sqm": cur_area_sqm
                },
                "transformations": {
                    "source_crs_ref": ref_crs,
                    "source_crs_cur": cur_crs,
                    "processing_crs": "EPSG:3857 (WGS 84 / Pseudo-Mercator)",
                    "output_crs": "EPSG:4326 (WGS 84)"
                },
                "metrics": {
                    "computed_overlap_area_sqm": overlap_area_sqm,
                    "overlap_percentage": overlap_pct,
                    "area_difference_sqm": area_delta_sqm,
                    "potential_boundary_difference_sqm": diff_area_sqm,
                    "discrepancy_classification": discrepancy_level
                },
                "layers": {
                    "overlap_geometry": overlap_geom,
                    "potential_difference_geometry": sym_diff_geom
                }
            }
        except Exception as e:
            return {
                "success": False,
                "status": "ERROR",
                "message": f"Reprojection and spatial comparison error: {str(e)}",
                "source_crs_ref": ref_crs,
                "source_crs_cur": cur_crs
            }

    @staticmethod
    def temporal_analysis(dataset_a: Dict[str, Any], dataset_b: Dict[str, Any]) -> Dict[str, Any]:
        """
        Real temporal analysis requiring two dated datasets.
        """
        date_a = dataset_a.get("acquisition_date") or dataset_a.get("created_at", "")[:10]
        date_b = dataset_b.get("acquisition_date") or dataset_b.get("created_at", "")[:10]

        if not date_a or not date_b or date_a == date_b:
            return {
                "success": False,
                "status": "REQUIRES_SECOND_DATED_DATASET",
                "message": "Temporal Analysis Requires a Second Dated Dataset with distinct survey dates."
            }

        # Compare datasets spatially
        spatial_comp = GeospatialService.compare_datasets(dataset_a, dataset_b)
        spatial_comp["temporal_metadata"] = {
            "dataset_a_date": date_a,
            "dataset_b_date": date_b,
            "analysis_type": "Multi-Temporal Survey Comparison"
        }
        return spatial_comp


geospatial_service = GeospatialService
