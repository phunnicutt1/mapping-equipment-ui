## Research Report: Automated BACnet Point Grouping and Equipment-Type Classification

**Date:** June 11, 2025

**Author:** Patrick Hunnicutt

### 1\. Executive Summary

This report outlines a complete methodology for an automated system to process raw BACnet point data, group points into equipment, classify equipment by type, and support a human-in-the-loop validation workflow. The proposed solution leverages the **Project Haystack** standard for semantic tagging and the **K-Modes clustering algorithm** to achieve high-accuracy equipment classification. The system is designed to be robust, adaptable, and capable of learning from user feedback to continuously improve its performance. Key features include automated template generation, confidence scoring, anomaly detection for new equipment types, and proactive auto-assignment of high-confidence equipment.

### 2\. Data Ingestion and Preprocessing

The system will accept two types of input files:

*   **BACnet Connector Information (**`**.csv**` **or** `**.txt**`**):** This file, exemplified by `bacnet_connectors.txt`, provides metadata for each piece of equipment, including a unique `Equip/Connector Name` and a `Description From Vendor`. The `Description From Vendor` will serve as the ground-truth label for supervised evaluation of the clustering results.
*   **BACnet Point Data (**`**.trio**`**):** Each `.trio` file contains the raw point data for a single piece of equipment. The filename of the `.trio` file (e.g., `L-10_L-12.trio`) will be used to link the points to the corresponding equipment in the connector file.

The initial step involves parsing these files and creating a unified data structure where each piece of equipment is an object containing its metadata and a list of its associated points.

### 3\. Feature Engineering: Creating Equipment Signatures with Project Haystack

This is the most critical step in the process. To compare and cluster equipment, we need to convert the raw point data into a consistent, machine-readable format. This will be achieved by creating an "equipment signature" for each device.

**Haystack Tag Dictionary:** A comprehensive dictionary mapping common BACnet point `dis` abbreviations (e.g., "SA-T", "EX", "P") to standardized Project Haystack tags (e.g., `supply`, `air`, `temp`, `exhaust`, `pressure`) will be created. This research has shown that the official Project Haystack documentation is the best source for these tags.

**Point Tagging:** For each point within a piece of equipment, the `dis` string will be tokenized and mapped to its corresponding Haystack tags. Other point attributes, such as `unit` (e.g., "°F" -> `temp`) and `writable` (-> `cmd` or `sp`), will be used to disambiguate and enrich the tags.

**Equipment Signature Vector:** The collection of all tags from all points on a piece of equipment forms its signature. This signature will be converted into a high-dimensional binary vector (a feature vector). Each position in the vector corresponds to a unique Haystack tag from our dictionary. The value will be 1 if the tag is present in the equipment's signature and 0 otherwise. This creates a uniform way to represent every piece of equipment.

### 4\. Clustering with K-Modes

With the equipment represented as feature vectors, we can now cluster them to identify equipment types.

1.  **Algorithm Choice:** The **K-Modes** clustering algorithm is the ideal choice for this task. It is specifically designed for categorical data and, unlike K-Means, uses a dissimilarity metric (simple matching/Hamming distance) and modes instead of means, which is a perfect fit for our binary feature vectors.
2.  **Implementation:** The `kmodes` Python library, which has a scikit-learn-like API, will be used for implementation.
3.  **Determining the Optimal Number of Clusters (k):** The **Elbow Method** will be used to find the optimal `k`. This involves running the K-Modes algorithm for a range of `k` values and plotting the cost (sum of intra-cluster dissimilarities). The "elbow" of the resulting curve indicates the point of diminishing returns and is a good estimate for the optimal number of clusters.

### 5\. Classification, Template Generation, and Confidence Scoring

1.  **Classification:** Each cluster produced by the K-Modes algorithm represents a distinct **equipment type**. All equipment instances within a cluster are classified as belonging to that type.
2.  **Template Generation:** The **mode** of each cluster (its `cluster_centroid_` in the `kmodes` library) serves as the **template** for that equipment type. This template is a feature vector representing the most common set of tags for that equipment type. These templates are the "suggested templates" that will be presented to the user.
3.  **Confidence Scoring:** A **confidence score** will be generated for each equipment instance's classification. This score will be based on the **Silhouette Score**, adapted for categorical data.
    *   A distance matrix will be pre-calculated for all equipment instances using the same matching dissimilarity metric as K-Modes.
    *   The `sklearn.metrics.silhouette_score` function will be used with the `metric='precomputed'` parameter.
    *   The resulting score (from -1 to 1) for each equipment instance will be normalized to a more intuitive scale (e.g., 0-100%). A high score indicates a high confidence that the equipment is a good fit for its assigned type.

### 6\. Anomaly Detection for New Equipment Types

The system must be able to identify equipment that doesn't fit well into any existing category, as these may represent new, undiscovered equipment types.

1.  **Dissimilarity as an Outlier Score:** The dissimilarity of an equipment instance to the mode (template) of its own assigned cluster will be used as an outlier score.
2.  **Flagging Anomalies:** A dissimilarity threshold will be established. Any equipment instance exceeding this threshold will be flagged as an **anomaly**.
3.  **Generating New Templates:** These flagged anomalies will be presented to the user in a separate "review" queue. If a user confirms that a group of similar anomalies represents a new, valid equipment type, a new template can be created from their common features.

### 7\. Human-in-the-Loop Workflow and Proactive Auto-Assignment

This entire automated process is designed to assist, not replace, the human expert. The workflow is as follows:

1.  **Initial Processing:** The system ingests the data, creates signatures, clusters the equipment, and generates initial templates and confidence scores.
2.  **User Verification:** The user is presented with the classified equipment, grouped by the derived equipment types. They can expand each type to see the equipment within it and the points for each piece of equipment.
3.  **Verification and Correction:** The user can:
    *   **Confirm** a classification if it is correct.
    *   **Correct** a misclassification by moving a piece of equipment to a different type.
    *   **Create** a new equipment type from flagged anomalies.
4.  **Learning from Feedback:** This is a crucial step. When a user **confirms** an equipment classification, the signature of that equipment is added to a pool of "verified signatures" for that equipment type.
5.  **Proactive Auto-Assignment:** After a user has verified a sufficient number of examples for a particular equipment type, the system can use this pool of verified signatures to proactively and automatically map unconfirmed equipment. If a new, unconfirmed piece of equipment has a signature that is an **exact match** to one of the verified signatures, the system can automatically assign it to that equipment type with a very high confidence score and move it to the "confirmed" state, removing it from the user's main workflow. This accelerates the mapping process significantly.

This methodology provides a comprehensive, intelligent, and adaptable system for solving the complex challenge of mapping raw BACnet data. It combines established standards, appropriate machine learning algorithms, and a robust human-in-the-loop workflow to deliver accurate and efficient results.