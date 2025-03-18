/********************************************************************************
 * Copyright (c) 2023 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0, or the MIT License which is
 * available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: EPL-2.0 OR MIT
 ********************************************************************************/
package com.borkdominik.big.glsp.uml.uml.elements.generalization;

import java.util.Set;

import com.borkdominik.big.glsp.server.core.manifest.BGRepresentationManifest;
import com.borkdominik.big.glsp.server.elements.manifest.integrations.BGEMFEdgeElementManifest;
import com.borkdominik.big.glsp.server.features.property_palette.BGPropertyPaletteContribution;
import com.borkdominik.big.glsp.server.features.property_palette.provider.BGDefaultPropertyPaletteProvider;
import com.borkdominik.big.glsp.uml.uml.UMLTypes;
import com.borkdominik.big.glsp.uml.uml.elements.generalization.features.GeneralizationPropertyProvider;
import com.borkdominik.big.glsp.uml.uml.elements.generalization.gmodel.GeneralizationGModelMapper;

public class GeneralizationElementManifest extends BGEMFEdgeElementManifest {
   public GeneralizationElementManifest(final BGRepresentationManifest manifest) {
      super(manifest, Set.of(UMLTypes.GENERALIZATION));
   }

   @Override
   protected void configureElement() {
      bindGModelMapper(GeneralizationGModelMapper.class);
      bindConfiguration(GeneralizationConfiguration.class);
      bindCreateHandler(GeneralizationOperationHandler.class);
      bindPropertyPalette(BGPropertyPaletteContribution.Options.builder()
         .propertyProviders(Set.of(
            GeneralizationPropertyProvider.class)));
   }
}
