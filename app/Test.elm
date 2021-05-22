module Test exposing (..)

import Config exposing (Config)
import Html exposing (Html, button, div, h3, h4, img, text)
import Html.Attributes exposing (class, src)
import Html.Events exposing (onClick)
import Json.Decode as Decode exposing (Decoder, field, list, string)


type Status
    = Running
    | Failure
    | Success
    | New


type alias Test =
    { url : String
    , status : Status
    , slug : String
    }


decoder : Decoder Test
decoder =
    let
        statusDecoder : String -> Decoder Status
        statusDecoder raw =
            case raw of
                "running" ->
                    Decode.succeed Running

                "failure" ->
                    Decode.succeed Failure

                "success" ->
                    Decode.succeed Success

                "new" ->
                    Decode.succeed New

                anythingElse ->
                    Decode.fail <| anythingElse ++ " is not a valid status"
    in
    Decode.map3 Test
        (field "url" string)
        (field "status" string |> Decode.andThen statusDecoder)
        (field "slug" string)


view : Config -> Test -> Html msg
view config test =
    let
        filePath folder =
            "file://" ++ config.root ++ "/vision/" ++ folder ++ "/" ++ test.slug ++ ".png"

        statusToHeader =
            case test.status of
                Running ->
                    "Running"

                Failure ->
                    "Failure"

                Success ->
                    "Success"

                New ->
                    "New"

        statusToContent =
            case test.status of
                Running ->
                    []

                Failure ->
                    [ img [ src <| filePath "original" ] []
                    , img [ src <| filePath "results" ] []
                    , img [ src <| filePath "new" ] []
                    ]

                Success ->
                    [ img [ src <| filePath "original" ] []
                    , div [] []
                    , img [ src <| filePath "new" ] []
                    ]

                New ->
                    [ div [] []
                    , div [] []
                    , img [ src <| filePath "new" ] []
                    ]
    in
    div []
        [ h3 [] [ text test.url ]
        , h4 [] [ text statusToHeader ]
        , div [ class "image-comparison" ] statusToContent
        ]
