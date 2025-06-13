#!/usr/bin/env python3
"""
BACnet Equipment Clustering Script
Uses K-modes clustering for categorical data analysis
"""

import sys
import json
import numpy as np
from kmodes.kmodes import KModes
from sklearn.metrics import silhouette_score
import argparse

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

def cluster_equipment(data):
    """
    Main clustering function
    
    Args:
        data: List of equipment with feature vectors
        
    Returns:
        Dictionary with clustering results
    """
    if not data or len(data) == 0:
        return {
            "clustered_equipment": [],
            "templates": [],
            "success": True
        }
    
    # Extract feature vectors
    feature_vectors = []
    vector_lengths = []
    for i, equipment in enumerate(data):
        if 'featureVector' in equipment:
            vec = equipment['featureVector']
            feature_vectors.append(vec)
            vector_lengths.append(len(vec))
        else:
            return {"error": "Missing featureVector in equipment data", "success": False}
    
    # Debug: Check for inconsistent vector lengths
    unique_lengths = set(vector_lengths)
    if len(unique_lengths) > 1:
        return {
            "error": f"Inconsistent feature vector lengths: {unique_lengths}. All vectors must have the same length.",
            "success": False,
            "debug_info": {
                "vector_lengths": vector_lengths[:10],  # First 10 for debugging
                "unique_lengths": list(unique_lengths)
            }
        }
    
    try:
        X = np.array(feature_vectors)
        print(f"Debug: Feature matrix shape: {X.shape}", file=sys.stderr)
        print(f"Debug: First few vectors: {X[:3] if len(X) > 0 else 'None'}", file=sys.stderr)
    except Exception as e:
        return {
            "error": f"Failed to create feature matrix: {str(e)}",
            "success": False,
            "debug_info": {
                "vector_lengths": vector_lengths[:10],
                "data_sample": str(feature_vectors[:2])[:200]  # Truncated sample
            }
        }
    
    if len(X) == 0:
        return {
            "clustered_equipment": [],
            "templates": [],
            "success": True
        }
    
    # Find optimal number of clusters
    optimal_k = find_optimal_k(X)
    print(f"Debug: Optimal K selected: {optimal_k}", file=sys.stderr)
    
    try:
        # Perform K-modes clustering
        km = KModes(n_clusters=optimal_k, init='Huang', n_init=10, verbose=0)
        cluster_labels = km.fit_predict(X)
        centroids = km.cluster_centroids_
        
        print(f"Debug: Clustering completed. Labels shape: {cluster_labels.shape}, Centroids shape: {centroids.shape}", file=sys.stderr)
        
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
        
        return {
            "clustered_equipment": clustered_equipment,
            "templates": templates,
            "optimal_k": int(optimal_k),  # Convert numpy int to Python int
            "success": True
        }
        
    except Exception as e:
        return {
            "error": f"Clustering failed: {str(e)}",
            "success": False,
            "debug_info": {
                "matrix_shape": str(X.shape),
                "optimal_k": optimal_k,
                "error_type": type(e).__name__
            }
        }

def main():
    """Main function to handle command line execution"""
    parser = argparse.ArgumentParser(description='Cluster BACnet equipment using K-modes')
    parser.add_argument('--input', type=str, required=True, help='Input JSON file or JSON string')
    parser.add_argument('--output', type=str, help='Output JSON file (optional)')
    
    args = parser.parse_args()
    
    try:
        # Try to parse as JSON string first, then as file path
        try:
            data = json.loads(args.input)
        except json.JSONDecodeError:
            # Assume it's a file path
            with open(args.input, 'r') as f:
                data = json.load(f)
        
        # Perform clustering
        result = cluster_equipment(data)
        
        # Output results
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(result, f, indent=2)
        else:
            print(json.dumps(result, indent=2))
            
    except Exception as e:
        error_result = {
            "error": str(e),
            "success": False
        }
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(error_result, f, indent=2)
        else:
            print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main() 