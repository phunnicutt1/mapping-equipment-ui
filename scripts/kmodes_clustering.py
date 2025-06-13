#!/usr/bin/env python3
"""
BACnet Equipment Clustering Script
Uses K-modes clustering for categorical data analysis
Enhanced with performance monitoring and robust error handling
"""

import sys
import json
import numpy as np
import time
import traceback
import psutil
import os
from kmodes.kmodes import KModes
from sklearn.metrics import silhouette_score
import argparse

# Performance monitoring
class PerformanceMonitor:
    def __init__(self):
        self.start_time = time.time()
        self.process = psutil.Process(os.getpid())
        self.initial_memory = self.process.memory_info().rss
        
    def get_metrics(self):
        current_time = time.time()
        current_memory = self.process.memory_info().rss
        
        return {
            "execution_time_seconds": round(current_time - self.start_time, 3),
            "memory_usage_mb": round(current_memory / 1024 / 1024, 2),
            "memory_delta_mb": round((current_memory - self.initial_memory) / 1024 / 1024, 2),
            "cpu_percent": round(self.process.cpu_percent(), 2)
        }

def log_debug(message, file=sys.stderr):
    """Enhanced debug logging with timestamps"""
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] DEBUG: {message}", file=file, flush=True)

def validate_input_data(data):
    """Validate input data structure and content"""
    if not isinstance(data, list):
        return False, "Input data must be a list"
    
    if len(data) == 0:
        return True, "Empty data is valid"  # Handle empty case gracefully
    
    # Check if all items have required fields
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            return False, f"Item {i} is not a dictionary"
        
        if 'featureVector' not in item:
            return False, f"Item {i} missing 'featureVector' field"
        
        if not isinstance(item['featureVector'], list):
            return False, f"Item {i} 'featureVector' is not a list"
        
        # Check for valid binary values
        for j, val in enumerate(item['featureVector']):
            if val not in [0, 1]:
                return False, f"Item {i} featureVector[{j}] = {val} is not binary (0 or 1)"
    
    # Check vector length consistency
    vector_lengths = [len(item['featureVector']) for item in data]
    if len(set(vector_lengths)) > 1:
        return False, f"Inconsistent vector lengths: {set(vector_lengths)}"
    
    return True, "Input data is valid"

def hamming_distance(X, Y):
    """Calculate Hamming distance between two vectors"""
    return np.sum(X != Y, axis=1)

def calculate_silhouette_scores(X, labels):
    """Calculate silhouette scores for categorical data using Hamming distance"""
    if len(np.unique(labels)) < 2:
        return [0] * len(labels)
    
    n_samples = len(X)
    scores = []
    
    for i in range(n_samples):
        # Points in same cluster
        same_cluster_mask = labels == labels[i]
        same_cluster_indices = np.where(same_cluster_mask)[0]
        
        # Remove the current point from same cluster calculation
        same_cluster_indices = same_cluster_indices[same_cluster_indices != i]
        
        if len(same_cluster_indices) > 0:
            same_cluster_points = X[same_cluster_indices]
            # Calculate mean distance to points in same cluster
            distances = []
            for point in same_cluster_points:
                dist = np.sum(X[i] != point)  # Hamming distance
                distances.append(dist)
            a = np.mean(distances) if distances else 0
        else:
            a = 0
        
        # Points in different clusters
        b_min = float('inf')
        for cluster_id in np.unique(labels):
            if cluster_id != labels[i]:
                other_cluster_mask = labels == cluster_id
                other_cluster_indices = np.where(other_cluster_mask)[0]
                
                if len(other_cluster_indices) > 0:
                    other_cluster_points = X[other_cluster_indices]
                    # Calculate mean distance to points in this other cluster
                    distances = []
                    for point in other_cluster_points:
                        dist = np.sum(X[i] != point)  # Hamming distance
                        distances.append(dist)
                    b = np.mean(distances) if distances else 0
                    b_min = min(b_min, b)
        
        if b_min == float('inf'):
            b_min = 0
        
        # Silhouette score
        if max(a, b_min) > 0:
            scores.append((b_min - a) / max(a, b_min))
        else:
            scores.append(0)
    
    return scores

def find_optimal_k(X, max_k=10):
    """Find optimal number of clusters using elbow method"""
    if len(X) <= 1:
        return 1
    
    max_k = min(max_k, len(X))
    costs = []
    
    for k in range(1, max_k + 1):
        try:
            km = KModes(n_clusters=k, init='Huang', n_init=5, verbose=0)
            km.fit(X)
            costs.append(km.cost_)
        except:
            costs.append(float('inf'))
    
    # Find elbow using simple heuristic
    if len(costs) < 3:
        return 1
    
    # Calculate rate of change
    deltas = [costs[i-1] - costs[i] for i in range(1, len(costs))]
    delta_deltas = [deltas[i-1] - deltas[i] for i in range(1, len(deltas))]
    
    if not delta_deltas:
        return 1
    
    # Find the point with maximum second derivative (elbow)
    elbow_idx = np.argmax(delta_deltas) + 2  # +2 because we started from index 1 twice
    return min(elbow_idx, max_k)

def calculate_dissimilarity_scores(X, centroids, cluster_labels):
    """Calculate dissimilarity scores for anomaly detection"""
    dissimilarity_scores = []
    
    for i, vector in enumerate(X):
        cluster_id = cluster_labels[i]
        centroid = centroids[cluster_id]
        
        # Calculate Hamming distance to cluster centroid
        dissimilarity = np.sum(vector != centroid)
        dissimilarity_scores.append(dissimilarity)
    
    return np.array(dissimilarity_scores)

def detect_anomalies(X, cluster_labels, centroids, data, threshold_percentile=95):
    """
    Detect anomalous equipment based on dissimilarity from cluster centroids
    
    Args:
        X: Feature matrix
        cluster_labels: Cluster assignments  
        centroids: Cluster centroids
        data: Original equipment data
        threshold_percentile: Percentile threshold for anomaly detection
        
    Returns:
        Dictionary with anomaly detection results
    """
    log_debug(f"Starting anomaly detection with threshold percentile: {threshold_percentile}")
    
    # Calculate dissimilarity scores
    dissimilarity_scores = calculate_dissimilarity_scores(X, centroids, cluster_labels)
    
    # Determine threshold for anomaly detection
    threshold = np.percentile(dissimilarity_scores, threshold_percentile)
    log_debug(f"Anomaly detection threshold: {threshold}")
    
    # Identify anomalies
    anomaly_indices = np.where(dissimilarity_scores >= threshold)[0]
    normal_indices = np.where(dissimilarity_scores < threshold)[0]
    
    # Calculate cluster quality metrics
    if len(np.unique(cluster_labels)) > 1:
        silhouette_scores = calculate_silhouette_scores(X, cluster_labels)
        avg_silhouette = np.mean(silhouette_scores)
    else:
        avg_silhouette = 0
    
    # Calculate cluster separation (average distance between centroids)
    if len(centroids) > 1:
        cluster_distances = []
        for i in range(len(centroids)):
            for j in range(i + 1, len(centroids)):
                dist = np.sum(centroids[i] != centroids[j])
                cluster_distances.append(dist)
        cluster_separation = np.mean(cluster_distances)
    else:
        cluster_separation = 0
    
    # Calculate intra-cluster distance (average distance within clusters)
    intra_cluster_distances = []
    for cluster_id in np.unique(cluster_labels):
        cluster_mask = cluster_labels == cluster_id
        cluster_vectors = X[cluster_mask]
        if len(cluster_vectors) > 1:
            distances = []
            for i in range(len(cluster_vectors)):
                for j in range(i + 1, len(cluster_vectors)):
                    dist = np.sum(cluster_vectors[i] != cluster_vectors[j])
                    distances.append(dist)
            if distances:
                intra_cluster_distances.extend(distances)
    
    avg_intra_distance = np.mean(intra_cluster_distances) if intra_cluster_distances else 0
    
    # Group similar anomalies
    anomaly_groups = group_similar_anomalies(X[anomaly_indices], anomaly_indices, data)
    
    # Create anomaly instances
    anomalies = []
    for idx in anomaly_indices:
        equipment = data[idx]
        dissimilarity = dissimilarity_scores[idx]
        
        # Determine confidence based on how much it exceeds threshold
        confidence = min(100, int(((dissimilarity - threshold) / threshold) * 100 + 50))
        
        # Find similar anomalies
        similar_anomalies = []
        for group in anomaly_groups:
            if idx in group and len(group) > 1:
                similar_anomalies = [str(data[i]['id']) for i in group if i != idx]
                break
        
        # Suggest actions based on anomaly characteristics
        suggested_actions = generate_anomaly_suggestions(equipment, dissimilarity, threshold, similar_anomalies)
        
        anomaly = {
            "id": equipment['id'],
            "name": equipment['name'],
            "pointIds": equipment.get('pointIds', []),
            "dissimilarityScore": float(dissimilarity),
            "confidence": confidence,
            "status": "detected",
            "detectionMethod": "dissimilarity-threshold",
            "detectedAt": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "suggestedActions": suggested_actions,
            "newEquipmentTypeCandidate": len(similar_anomalies) >= 2,  # Candidate if has similar anomalies
            "similarAnomalies": similar_anomalies,
            "fileName": equipment.get('fileName')
        }
        anomalies.append(anomaly)
    
    anomaly_rate = len(anomalies) / len(data) * 100 if len(data) > 0 else 0
    
    log_debug(f"Detected {len(anomalies)} anomalies out of {len(data)} equipment ({anomaly_rate:.1f}%)")
    
    return {
        "anomalies": anomalies,
        "totalProcessed": len(data),
        "anomalyRate": anomaly_rate,
        "detectionThreshold": float(threshold),
        "clusterQualityMetrics": {
            "averageSilhouetteScore": float(avg_silhouette),
            "clusterSeparation": float(cluster_separation),
            "intraClusterDistance": float(avg_intra_distance)
        }
    }

def group_similar_anomalies(anomaly_vectors, anomaly_indices, data, similarity_threshold=0.7):
    """Group similar anomalies that might represent new equipment types"""
    if len(anomaly_vectors) < 2:
        return [[idx] for idx in anomaly_indices]
    
    # Calculate pairwise similarities
    similarities = []
    for i in range(len(anomaly_vectors)):
        for j in range(i + 1, len(anomaly_vectors)):
            # Calculate Jaccard similarity for binary vectors
            intersection = np.sum(anomaly_vectors[i] & anomaly_vectors[j])
            union = np.sum(anomaly_vectors[i] | anomaly_vectors[j])
            similarity = intersection / union if union > 0 else 0
            similarities.append((i, j, similarity))
    
    # Group based on similarity threshold
    groups = []
    used_indices = set()
    
    for i, j, similarity in sorted(similarities, key=lambda x: x[2], reverse=True):
        if similarity >= similarity_threshold:
            # Find existing groups that contain either index
            target_group = None
            for group in groups:
                if i in group or j in group:
                    target_group = group
                    break
            
            if target_group is not None:
                target_group.extend([i, j])
                target_group = list(set(target_group))  # Remove duplicates
            else:
                groups.append([i, j])
            
            used_indices.update([i, j])
    
    # Add singleton groups for unused indices
    for i in range(len(anomaly_vectors)):
        if i not in used_indices:
            groups.append([i])
    
    # Convert local indices back to original indices
    return [[anomaly_indices[local_idx] for local_idx in group] for group in groups]

def generate_anomaly_suggestions(equipment, dissimilarity, threshold, similar_anomalies):
    """Generate suggested actions for an anomaly"""
    suggestions = []
    
    # Calculate how anomalous this equipment is
    anomaly_strength = (dissimilarity - threshold) / threshold
    
    if len(similar_anomalies) >= 2:
        # High confidence suggestion to create new type
        suggestions.append({
            "type": "create-new-type",
            "description": f"Group with {len(similar_anomalies)} similar anomalies to create new equipment type",
            "confidence": min(90, int(70 + anomaly_strength * 20)),
            "similarAnomalyIds": similar_anomalies
        })
        
        suggestions.append({
            "type": "group-with-similar", 
            "description": "Group with similar anomalies for further analysis",
            "confidence": 85,
            "similarAnomalyIds": similar_anomalies
        })
    else:
        # Suggest manual review or assignment to existing type
        suggestions.append({
            "type": "mark-outlier",
            "description": "Mark as outlier equipment for manual review",
            "confidence": 75
        })
        
        if anomaly_strength < 0.5:  # Less anomalous, might fit existing type
            suggestions.append({
                "type": "assign-to-existing",
                "description": "Consider assigning to most similar existing equipment type",
                "confidence": int(60 - anomaly_strength * 30)
            })
    
    return suggestions

def cluster_equipment(data):
    """
    Main clustering function with enhanced error handling and monitoring
    
    Args:
        data: List of equipment with feature vectors
        
    Returns:
        Dictionary with clustering results and performance metrics
    """
    monitor = PerformanceMonitor()
    log_debug(f"Starting clustering with {len(data) if data else 0} equipment instances")
    
    # Validate input data
    is_valid, validation_message = validate_input_data(data)
    if not is_valid:
        return {
            "error": f"Input validation failed: {validation_message}",
            "success": False,
            "performance": monitor.get_metrics()
        }
    
    if not data or len(data) == 0:
        log_debug("Empty data provided, returning empty result")
        return {
            "clustered_equipment": [],
            "templates": [],
            "success": True,
            "performance": monitor.get_metrics()
        }
    
    # Extract feature vectors with enhanced error handling
    try:
        feature_vectors = []
        for i, equipment in enumerate(data):
            if 'featureVector' not in equipment:
                return {
                    "error": f"Equipment {i} missing featureVector field",
                    "success": False,
                    "performance": monitor.get_metrics()
                }
            feature_vectors.append(equipment['featureVector'])
        
        log_debug(f"Extracted {len(feature_vectors)} feature vectors")
        
        # Create numpy array with error handling
        X = np.array(feature_vectors, dtype=int)
        log_debug(f"Feature matrix shape: {X.shape}")
        log_debug(f"Feature matrix sample: {X[:min(3, len(X))].tolist()}")
        
    except Exception as e:
        return {
            "error": f"Failed to create feature matrix: {str(e)}",
            "success": False,
            "performance": monitor.get_metrics(),
            "debug_info": {
                "traceback": traceback.format_exc(),
                "data_sample_count": len(data)
            }
        }
    
    if len(X) == 0:
        log_debug("Empty feature matrix, returning empty result")
        return {
            "clustered_equipment": [],
            "templates": [],
            "success": True,
            "performance": monitor.get_metrics()
        }
    
    # Find optimal number of clusters with monitoring
    try:
        log_debug("Finding optimal number of clusters...")
        optimal_k = find_optimal_k(X)
        log_debug(f"Optimal K selected: {optimal_k}")
        
        # Perform K-modes clustering with timeout protection
        log_debug("Starting K-modes clustering...")
        clustering_start = time.time()
        
        km = KModes(n_clusters=optimal_k, init='Huang', n_init=10, verbose=0)
        cluster_labels = km.fit_predict(X)
        centroids = km.cluster_centroids_
        
        clustering_time = time.time() - clustering_start
        log_debug(f"Clustering completed in {clustering_time:.3f}s. Labels shape: {cluster_labels.shape}, Centroids shape: {centroids.shape}")
        
        # Calculate confidence scores using silhouette analysis
        silhouette_scores = calculate_silhouette_scores(X, cluster_labels)
        
        # Prepare results
        clustered_equipment = []
        for i, equipment in enumerate(data):
            score = silhouette_scores[i]
            confidence = int(((score + 1) / 2) * 100)  # Convert to 0-100 scale
            
            result_equipment = equipment.copy()
            result_equipment['cluster'] = int(cluster_labels[i])
            result_equipment['confidence'] = max(0, min(100, confidence))
            result_equipment['status'] = 'needs-review' if confidence < 50 else 'suggested'
            
            clustered_equipment.append(result_equipment)
        
        # Generate templates from centroids
        templates = []
        for i, centroid in enumerate(centroids):
            template = {
                "id": f"template-{i}",
                "name": f"Auto-Generated Template {i + 1}",
                "equipmentTypeId": f"type-{i}",
                "createdFrom": "auto-clustering",
                "featureVector": [int(x) for x in centroid.tolist()],  # Convert numpy types to int
                "color": f"bg-blue-{500 + (i * 100) % 400}",
                "appliedCount": int(np.sum(cluster_labels == i))
            }
            templates.append(template)
        
        # Perform anomaly detection
        log_debug("Running anomaly detection...")
        anomaly_detection_result = detect_anomalies(X, cluster_labels, centroids, data)
        
        final_metrics = monitor.get_metrics()
        log_debug(f"Clustering pipeline with anomaly detection completed successfully in {final_metrics['execution_time_seconds']}s")
        
        return {
            "clustered_equipment": clustered_equipment,
            "templates": templates,
            "anomaly_detection": anomaly_detection_result,
            "optimal_k": int(optimal_k),  # Convert numpy int to Python int
            "clustering_time_seconds": clustering_time,
            "performance": final_metrics,
            "success": True
        }
        
    except Exception as e:
        error_metrics = monitor.get_metrics()
        log_debug(f"Clustering failed after {error_metrics['execution_time_seconds']}s: {str(e)}")
        
        return {
            "error": f"Clustering failed: {str(e)}",
            "success": False,
            "performance": error_metrics,
            "debug_info": {
                "matrix_shape": str(X.shape) if 'X' in locals() else "unknown",
                "optimal_k": optimal_k if 'optimal_k' in locals() else "unknown",
                "error_type": type(e).__name__,
                "traceback": traceback.format_exc()
            }
        }

def main():
    """Main function to handle command line execution with enhanced error handling"""
    parser = argparse.ArgumentParser(description='Cluster BACnet equipment using K-modes')
    parser.add_argument('--input', type=str, required=True, help='Input JSON file or JSON string')
    parser.add_argument('--output', type=str, help='Output JSON file (optional)')
    parser.add_argument('--timeout', type=int, default=120, help='Timeout in seconds (default: 120)')
    
    args = parser.parse_args()
    
    # Set up timeout handling
    import signal
    
    def timeout_handler(signum, frame):
        raise TimeoutError(f"Clustering operation timed out after {args.timeout} seconds")
    
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(args.timeout)
    
    try:
        log_debug(f"Starting clustering script with timeout: {args.timeout}s")
        
        # Try to parse as JSON string first, then as file path
        try:
            data = json.loads(args.input)
            log_debug("Input parsed as JSON string")
        except json.JSONDecodeError:
            # Assume it's a file path
            log_debug(f"Attempting to read input file: {args.input}")
            with open(args.input, 'r') as f:
                data = json.load(f)
            log_debug(f"Successfully loaded {len(data)} items from file")
        
        # Perform clustering
        result = cluster_equipment(data)
        
        # Cancel timeout
        signal.alarm(0)
        
        # Output results
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(result, f, indent=2)
            log_debug(f"Results written to {args.output}")
        else:
            print(json.dumps(result, indent=2))
            
    except TimeoutError as e:
        signal.alarm(0)
        error_result = {
            "error": str(e),
            "success": False,
            "error_type": "timeout"
        }
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(error_result, f, indent=2)
        else:
            print(json.dumps(error_result, indent=2))
        sys.exit(1)
        
    except Exception as e:
        signal.alarm(0)
        log_debug(f"Script failed with error: {str(e)}")
        error_result = {
            "error": str(e),
            "success": False,
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        }
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(error_result, f, indent=2)
        else:
            print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main() 